/**
 * SAAT MERKEZİ: takvim + bildirim geçmişi
 * ------------------------------------------------------------------
 * Üst çubuktaki saat veya masaüstünün sağ alt köşesindeki saat/tarih
 * alanı tıklanınca açılır. Ajanda (Organizer) kartı olan günlerde nokta.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { BellOff, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { isoDay, monthGrid } from "@/lib/shell/calendar";
import { clearNotices, markAllNoticesRead, useNotices } from "@/lib/shell/notifications";
import { listDocs, openDoc } from "@/lib/office/documents";

export const OPEN_CLOCK_EVENT = "tedbirge:open-clock";
export const openClockCenter = () => window.dispatchEvent(new Event(OPEN_CLOCK_EVENT));

const WEEK = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

/** Masaüstünün sağ alt köşesindeki saat/tarih alanı. */
export function TrayClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <button
      type="button"
      onClick={openClockCenter}
      aria-label="Takvim ve bildirimler"
      className="wa-press absolute right-3 bottom-3 z-[5] hidden rounded-xl bg-[color-mix(in_srgb,var(--tb-panel-solid)_70%,transparent)] px-3 py-1.5 text-right font-osmono leading-tight text-[var(--tb-text)] backdrop-blur md:block"
    >
      <span className="block text-[12px]">
        {now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="block text-[10px] text-[var(--tb-muted)]">
        {now.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" })}
      </span>
    </button>
  );
}

function useAgendaDays(open: boolean): Set<string> {
  const [days, setDays] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void (async () => {
      const out = new Set<string>();
      for (const d of await listDocs("organizer")) {
        const text = await openDoc(d.id);
        try {
          const data = JSON.parse(text ?? "") as { cards?: Array<{ due?: string }> } | Array<{ due?: string }>;
          const cards = Array.isArray(data) ? data : (data.cards ?? []);
          cards.forEach((c) => c.due && out.add(c.due));
        } catch {
          /* bozuk ajanda atlanır */
        }
      }
      if (alive) setDays(out);
    })();
    return () => {
      alive = false;
    };
  }, [open]);
  return days;
}

export function ClockCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(() => new Date());
  const notices = useNotices();
  const agenda = useAgendaDays(open);
  const grid = useMemo(() => monthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const today = isoDay(new Date());
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onClose = () => closeRef.current();
    setCursor(new Date());
    markAllNoticesRead();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const t = setTimeout(() => window.addEventListener("pointerdown", onDown), 0);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!open) return null;
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Takvim ve bildirimler"
      className="fixed right-2 bottom-14 z-[95] w-[min(94vw,340px)] overflow-hidden rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] shadow-2xl md:top-12 md:bottom-auto"
    >
      <div className="border-b border-[var(--tb-border)] p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" aria-label="Önceki ay" onClick={() => shift(-1)} className="wa-press rounded-lg p-1.5 text-[var(--tb-muted)] hover:text-[var(--tb-text)]">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="text-[13px] font-semibold text-[var(--tb-text)] capitalize"
          >
            {cursor.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}
          </button>
          <button type="button" aria-label="Sonraki ay" onClick={() => shift(1)} className="wa-press rounded-lg p-1.5 text-[var(--tb-muted)] hover:text-[var(--tb-text)]">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center" role="grid" aria-label="Takvim">
          {WEEK.map((d) => (
            <span key={d} className="py-1 font-osmono text-[10px] text-[var(--tb-muted)]">
              {d}
            </span>
          ))}
          {grid.map((d) => {
            const key = isoDay(d);
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = key === today;
            return (
              <span
                key={key}
                role="gridcell"
                aria-current={isToday ? "date" : undefined}
                className={`relative grid h-8 place-items-center rounded-lg text-[12px] ${
                  isToday
                    ? "bg-[var(--tb-accent)] font-semibold text-[var(--tb-bg)]"
                    : inMonth
                      ? "text-[var(--tb-text)]"
                      : "text-[var(--tb-muted)] opacity-50"
                }`}
              >
                {d.getDate()}
                {agenda.has(key) ? (
                  <span className={`absolute bottom-1 h-1 w-1 rounded-full ${isToday ? "bg-[var(--tb-bg)]" : "bg-[var(--tb-accent)]"}`} />
                ) : null}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pt-2">
        <span className="font-osmono text-[11px] text-[var(--tb-muted)]">Bildirim geçmişi</span>
        <button
          type="button"
          onClick={() => clearNotices()}
          aria-label="Bildirimleri temizle"
          className="wa-press rounded-lg p-1.5 text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-[32vh] overflow-y-auto p-2">
        {notices.length === 0 ? (
          <p className="flex items-center justify-center gap-2 py-6 text-[12px] text-[var(--tb-muted)]">
            <BellOff className="h-4 w-4" aria-hidden /> Bildirim yok
          </p>
        ) : (
          <ul className="space-y-1">
            {notices.map((n) => (
              <li key={n.id} className="rounded-lg bg-[var(--tb-bg-soft)] px-2.5 py-1.5">
                <div className="flex justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-[var(--tb-text)]">{n.title}</span>
                  <span className="shrink-0 font-osmono text-[10px] text-[var(--tb-muted)]">
                    {new Date(n.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {n.detail ? <p className="text-[11px] text-[var(--tb-muted)]">{n.detail}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
