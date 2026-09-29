/**
 * SİSTEM GÜNLÜK KAYITLARI
 * ------------------------------------------------------------------
 * Arama, seviye ve tarih aralığı filtresi; CSV/NDJSON dışa aktarım; ilk 500 satır çizilir, 5000 satır bellekte tutulur.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileJson, ScrollText, Trash2 } from "lucide-react";

import {
  Badge,
  EmptyState,
  GlassCard,
  Modal,
  TableSkeleton,
  ghostBtn,
  inputClass,
  labelClass,
  primaryBtn,
} from "@/components/shell/apps/portal/ui";
import { usePortal } from "@/lib/portal/store";
import { logsToCsv, logsToNdjson } from "@/lib/portal/export";
import { useCarrierScheduler } from "@/lib/carrier-scheduler";
import { useServiceEvents } from "@/shell/services/services";
import { serviceEventsToLogs } from "@/shell/services/log-map";
import { LOG_LEVEL_LABEL, type LogLevel, type PortalLog } from "@/lib/portal/types";

function fmt(at: number): string {
  const d = new Date(at);
  return `${d.toLocaleString("tr-TR")}.${String(d.getMilliseconds()).padStart(3, "0")}`;
}

/** Bellekte tutulan en fazla satır. */
const MAX_ROWS = 5000;

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function LogsPanel() {
  const { ready, logs, clearLogs } = usePortal();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | LogLevel>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const [frozen, setFrozen] = useState<PortalLog[] | null>(null);
  // Taşıyıcı zamanlayıcı olayları (yalnız sayaç değişimi; içerik kaydedilmez).
  const sched = useCarrierScheduler();
  const [events, setEvents] = useState<PortalLog[]>([]);
  const prev = useRef({ sent: sched.sent, blocked: sched.blocked });
  useEffect(() => {
    const p = prev.current;
    const add: PortalLog[] = [];
    if (sched.blocked > p.blocked)
      add.push({
        id: `sc-b-${Date.now()}`,
        at: Date.now(),
        level: "uyari",
        source: "tasiyici",
        message: `${sched.blocked - p.blocked} gönderim bölge kuralıyla bekletildi (${sched.region})`,
      });
    if (sched.sent > p.sent)
      add.push({
        id: `sc-s-${Date.now()}`,
        at: Date.now(),
        level: "bilgi",
        source: "tasiyici",
        message: `${sched.sent - p.sent} çerçeve gönderildi`,
      });
    prev.current = { sent: sched.sent, blocked: sched.blocked };
    if (add.length) setEvents((e) => [...add, ...e].slice(0, MAX_ROWS));
  }, [sched.sent, sched.blocked, sched.region]);
  const svcEvents = useServiceEvents();
  const svcLogs = useMemo(() => serviceEventsToLogs(svcEvents), [svcEvents]);
  const source =
    paused && frozen
      ? frozen
      : [...svcLogs, ...events, ...logs].sort((a, b) => b.at - a.at).slice(0, MAX_ROWS);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    return source
      .filter((l) => {
        if (level !== "all" && l.level !== level) return false;
        if (fromMs !== null && l.at < fromMs) return false;
        if (toMs !== null && l.at > toMs) return false;
        if (!needle) return true;
        return (
          l.message.toLocaleLowerCase("tr").includes(needle) ||
          l.source.toLocaleLowerCase("tr").includes(needle)
        );
      })
      .sort((a, b) => b.at - a.at);
  }, [source, q, level, from, to]);

  async function doClear() {
    setBusy(true);
    try {
      await clearLogs();
      toast.success("Günlük kayıtları temizlendi.");
    } catch {
      toast.error("Kayıtlar temizlenemedi.");
    } finally {
      setBusy(false);
      setConfirmClear(false);
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h3 className="truncate text-[14px] font-semibold text-[var(--tb-text)]">
            Sistem günlük kayıtları
          </h3>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className={ghostBtn}
              disabled={filtered.length === 0}
              onClick={() => {
                download(
                  `tedbirge-kayitlar-${new Date().toISOString().slice(0, 10)}.csv`,
                  "text/csv;charset=utf-8",
                  logsToCsv(filtered),
                );
                toast.success("CSV indirildi.");
              }}
            >
              <Download className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              CSV
            </button>
            <button
              type="button"
              className={ghostBtn}
              disabled={filtered.length === 0}
              onClick={() => {
                download(
                  `tedbirge-kayitlar-${new Date().toISOString().slice(0, 10)}.ndjson`,
                  "application/x-ndjson",
                  logsToNdjson(filtered),
                );
                toast.success("NDJSON indirildi.");
              }}
            >
              <FileJson className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              NDJSON
            </button>
            <button
              type="button"
              className={ghostBtn}
              aria-pressed={paused}
              onClick={() => {
                if (!paused) setFrozen(source);
                setPaused(!paused);
              }}
            >
              {paused ? "Sürdür" : "Duraklat"}
            </button>
            <button
              type="button"
              className={ghostBtn}
              disabled={logs.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Temizle
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className={labelClass}>
            Ara
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Mesaj veya kaynak"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Seviye
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as typeof level)}
              className={inputClass}
            >
              <option value="all">Tümü</option>
              <option value="bilgi">Bilgi</option>
              <option value="uyari">Uyarı</option>
              <option value="hata">Hata</option>
            </select>
          </label>
          <label className={labelClass}>
            Başlangıç
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Bitiş
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <div className="mt-3">
          {!ready ? (
            <TableSkeleton rows={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={logs.length === 0 ? "Kayıt yok" : "Eşleşen kayıt yok"}
              description={
                logs.length === 0
                  ? "Portalda yapılan her işlem otomatik olarak buraya yazılır."
                  : "Arama ve tarih aralığını genişletip yeniden deneyin."
              }
              icon={<ScrollText className="h-6 w-6" aria-hidden />}
              action={
                logs.length > 0 ? (
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => {
                      setQ("");
                      setLevel("all");
                      setFrom("");
                      setTo("");
                    }}
                  >
                    Filtreleri temizle
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--tb-border)]">
              {filtered.slice(0, 500).map((l) => (
                <li key={l.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-[var(--tb-text)]">{l.message}</p>
                    <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
                      {fmt(l.at)} · {l.source}
                    </p>
                  </div>
                  <Badge tone={l.level === "hata" ? "bad" : l.level === "uyari" ? "warn" : "muted"}>
                    {LOG_LEVEL_LABEL[l.level]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </GlassCard>

      <Modal open={confirmClear} title="Kayıtları temizle" onClose={() => setConfirmClear(false)}>
        <p className="text-[13px] text-[var(--tb-text)]">
          Tüm günlük kayıtları cihazdan silinecek. Devam edilsin mi?
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={() => setConfirmClear(false)}>
            Vazgeç
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={busy}
            onClick={() => void doClear()}
          >
            Temizle
          </button>
        </div>
      </Modal>
    </div>
  );
}
