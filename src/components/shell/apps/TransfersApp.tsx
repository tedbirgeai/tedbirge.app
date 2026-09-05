/**
 * AKTARIM — tOS aktarım merkezi
 * ------------------------------------------------------------------
 * Üç bölüm: gelen (indirmeler), giden (yüklemeler) ve geçmiş. Hız ve
 * yüzde canlı okunur; duraklat/iptal düğmeleri gönderim döngüsünü
 * doğrudan denetler. Hiçbir dosya buluta kopyalanmaz.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, Pause, Play, Trash2, X } from "lucide-react";

import { WindowEmpty } from "@/components/shell/WindowShell";
import { notifyOk } from "@/lib/shell/notify";
import {
  bootFileTransfer,
  cancelTransfer,
  clearTransfer,
  listTransfers,
  onTransferChange,
  pauseTransfer,
  resumeTransfer,
  type Transfer,
} from "@/lib/p2p/file-transfer";

type TabId = "in" | "out" | "gecmis";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "in", label: "Aktif İndirmeler" },
  { id: "out", label: "Yüklemeler" },
  { id: "gecmis", label: "Aktarım Geçmişi" },
];

const btn =
  "wa-press inline-flex items-center gap-1.5 rounded-lg border border-[var(--tb-border)] px-2.5 py-1.5 font-osmono text-[11px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]";

function size(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function speedLabel(n: number) {
  if (!n) return "—";
  return n < 1024 * 1024
    ? `${(n / 1024).toFixed(0)} KB/sn`
    : `${(n / 1024 / 1024).toFixed(1)} MB/sn`;
}

const STATUS: Record<Transfer["status"], string> = {
  gonderiliyor: "gönderiliyor",
  aliniyor: "alınıyor",
  duraklatildi: "duraklatıldı",
  iptal: "iptal edildi",
  tamam: "tamamlandı",
  hata: "hata",
};

function Item({ t }: { t: Transfer }) {
  const live =
    t.status === "gonderiliyor" || t.status === "aliniyor" || t.status === "duraklatildi";
  return (
    <li className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-medium text-[var(--tb-text)]">{t.name}</p>
        <span className="shrink-0 font-osmono text-[11px] text-[var(--tb-muted)]">
          {t.percent}% · {speedLabel(t.speed)}
        </span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--tb-border)]"
        role="progressbar"
        aria-valuenow={t.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${t.name} ilerlemesi`}
      >
        <div className="h-full bg-[var(--tb-accent)]" style={{ width: `${t.percent}%` }} />
      </div>
      <p className="mt-1.5 font-osmono text-[11px] text-[var(--tb-muted)]">
        {size(t.size)} · {STATUS[t.status]} · {t.peer.slice(0, 10)}
        {t.error ? ` · ${t.error}` : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {t.dir === "out" && live ? (
          t.status === "duraklatildi" ? (
            <button type="button" className={btn} onClick={() => resumeTransfer(t.id)}>
              <Play className="h-3.5 w-3.5" aria-hidden /> Devam et
            </button>
          ) : (
            <button type="button" className={btn} onClick={() => pauseTransfer(t.id)}>
              <Pause className="h-3.5 w-3.5" aria-hidden /> Duraklat
            </button>
          )
        ) : null}
        {live ? (
          <button type="button" className={btn} onClick={() => cancelTransfer(t.id)}>
            <X className="h-3.5 w-3.5" aria-hidden /> İptal et
          </button>
        ) : null}
        {t.dataUrl ? (
          <a className={btn} href={t.dataUrl} download={t.name}>
            <Download className="h-3.5 w-3.5" aria-hidden /> İndir
          </a>
        ) : null}
        {!live ? (
          <button
            type="button"
            className={btn}
            onClick={() => {
              clearTransfer(t.id);
              notifyOk("Kayıt silindi", t.name);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Listeden kaldır
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function TransfersApp() {
  const [tab, setTab] = useState<TabId>("in");
  const [items, setItems] = useState<Transfer[]>([]);

  useEffect(() => {
    bootFileTransfer();
    setItems(listTransfers());
    return onTransferChange(() => setItems(listTransfers()));
  }, []);

  const list = useMemo(() => {
    const live = (t: Transfer) =>
      t.status === "gonderiliyor" || t.status === "aliniyor" || t.status === "duraklatildi";
    if (tab === "in") return items.filter((t) => t.dir === "in" && live(t));
    if (tab === "out") return items.filter((t) => t.dir === "out" && live(t));
    return items.filter((t) => !live(t));
  }, [items, tab]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[var(--tb-border)] p-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`wa-press shrink-0 rounded-full border px-3 py-1 font-osmono text-[11px] ${
              tab === t.id
                ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                : "border-[var(--tb-border)] text-[var(--tb-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {list.length === 0 ? (
          <WindowEmpty
            title="Aktif aktarım bulunmuyor"
            hint="Dosyalar penceresinden bir dosyayı eşe gönderdiğinizde ilerleme burada görünür."
          />
        ) : (
          <ul className="grid gap-2">
            {list.map((t) => (
              <Item key={t.id} t={t} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
