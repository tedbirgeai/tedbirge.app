/**
 * EŞ DURUM GÖSTERGESİ
 * ------------------------------------------------------------------
 * Üst barda tek bir renkli nokta + kısa etiket. Ayrıntılar (cihaz sayısı,
 * gecikme, bellek) yalnız tıklanınca açılan küçük panelde gösterilir.
 */

import { memo, useEffect, useRef, useState } from "react";

import { usePeerStatus } from "@/lib/shell/peer-status";
import { useMemoryMb } from "@/lib/shell/telemetry-store";

export const PeerStatusIndicator = memo(function PeerStatusIndicator() {
  const { text, peers, rttMs } = usePeerStatus();
  const memMb = useMemoryMb();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const upd = () => setOnline(navigator.onLine);
    upd();
    window.addEventListener("online", upd);
    window.addEventListener("offline", upd);
    return () => {
      window.removeEventListener("online", upd);
      window.removeEventListener("offline", upd);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  const state = peers > 0 ? "bagli" : online ? "tek" : "cevrimdisi";
  const label = state === "bagli" ? "Bağlı" : state === "tek" ? "Tek başına" : "Çevrimdışı";
  const color =
    state === "bagli"
      ? "var(--tb-emerald-400, var(--tb-accent))"
      : state === "tek"
        ? "var(--tb-amber-400, var(--tb-muted))"
        : "var(--tb-rose-400, var(--tb-muted))";

  return (
    <span ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Ağ durumu: ${label}`}
        title={label}
        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] text-[var(--tb-muted)] hover:bg-[var(--tb-panel-soft)]"
      >
        <span className="block h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
        <span className="hidden sm:inline">{label}</span>
      </button>
      {open ? (
        <span
          role="dialog"
          aria-label="Ağ ayrıntıları"
          className="absolute right-0 top-full z-[200] mt-1 block w-56 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3 text-[12px] text-[var(--tb-text)] shadow-lg"
        >
          <span className="mb-1 block truncate text-[var(--tb-muted)]">{text}</span>
          <span className="flex justify-between">
            <span>Bağlı cihaz</span>
            <strong className="tabular-nums">{peers}</strong>
          </span>
          <span className="flex justify-between">
            <span>Gecikme</span>
            <strong className="tabular-nums">{rttMs != null ? `${rttMs} ms` : "—"}</strong>
          </span>
          <span className="flex justify-between">
            <span>Bellek</span>
            <strong className="tabular-nums">{memMb != null ? `${memMb} MB` : "—"}</strong>
          </span>
        </span>
      ) : null}
    </span>
  );
});
