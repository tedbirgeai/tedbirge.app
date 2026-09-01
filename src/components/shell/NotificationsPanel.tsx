/**
 * BİLDİRİM PANELİ
 * ------------------------------------------------------------------
 * Üst bardaki zil ikonundan açılır. Sistem olaylarını kronolojik
 * listeler, okundu işaretler ve temizler. Renkler yalnız --tb-*.
 */

import { useEffect, useRef } from "react";
import { BellOff, CheckCheck, Trash2 } from "lucide-react";

import {
  clearNotices,
  markAllNoticesRead,
  useNotices,
  type Notice,
} from "@/lib/shell/notifications";

function timeLabel(at: number): string {
  const diff = Date.now() - at;
  if (diff < 60_000) return "az önce";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} dk önce`;
  return new Date(at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function accent(kind: Notice["kind"]): string {
  if (kind === "error") return "var(--tb-danger, #e5484d)";
  if (kind === "ok") return "var(--tb-accent)";
  return "var(--tb-muted)";
}

export function NotificationsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const notices = useNotices();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    markAllNoticesRead();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Bildirimler"
      className="absolute right-2 top-[calc(100%+6px)] z-[95] max-h-[70vh] w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--tb-border)] px-3 py-2">
        <p className="font-osmono text-[12px] text-[var(--tb-text)]">Bildirimler</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => markAllNoticesRead()}
            aria-label="Tümünü okundu işaretle"
            title="Tümünü okundu işaretle"
            className="wa-press grid min-h-12 min-w-12 place-items-center rounded-xl text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => clearNotices()}
            aria-label="Bildirimleri temizle"
            title="Temizle"
            className="wa-press grid min-h-12 min-w-12 place-items-center rounded-xl text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="max-h-[56vh] overflow-y-auto p-2">
        {notices.length === 0 ? (
          <div className="grid place-items-center gap-2 px-4 py-10 text-center">
            <BellOff className="h-5 w-5 text-[var(--tb-muted)]" aria-hidden />
            <p className="text-[13px] text-[var(--tb-text)]">Bildirim yok</p>
            <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
              Sistem olayları burada birikir.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {notices.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="min-w-0 truncate text-[13px] font-medium"
                    style={{ color: accent(n.kind) }}
                  >
                    {n.title}
                  </span>
                  <span className="shrink-0 font-osmono text-[10px] text-[var(--tb-muted)]">
                    {timeLabel(n.at)}
                  </span>
                </div>
                {n.detail ? (
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--tb-muted)]">
                    {n.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
