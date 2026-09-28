/**
 * OTONOM DURUM ROZETİ
 * ------------------------------------------------------------------
 * Taşıyıcı zamanlayıcı ve spektrum sınırlarını tek satırlık bir
 * göstergeye indirger. Saniyede en fazla bir kez yeniden hesaplanır.
 */

import { useEffect, useMemo, useState } from "react";

import { useCarrierScheduler } from "@/lib/carrier-scheduler";
import { autonomyOf } from "@/lib/portal/live";

const DOT = { ok: "bg-[var(--tb-emerald-400)]", warn: "bg-[var(--tb-amber-400)]", error: "bg-[var(--tb-rose-500)]" };

export function AutonomyBadge() {
  const snap = useCarrierScheduler();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const a = useMemo(() => autonomyOf(snap), [tick]);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-2 rounded-full border border-[var(--tb-border)] px-3 font-osmono text-[11px] text-[var(--tb-text)]"
      >
        <span className={`h-2 w-2 rounded-full ${DOT[a.tone]}`} aria-hidden />
        {a.text}
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-3 text-[12px] text-[var(--tb-text)] shadow-lg">
          <p>
            Taşıyıcılar: {a.carriersOpen} / {a.carriersTotal} açık
          </p>
          <p>Bölge: {a.region}</p>
          <p className="mt-1 text-[var(--tb-muted)]">{a.detail}</p>
          <a href="/mevzuat" className="mt-2 inline-block text-[var(--tb-accent)] underline">
            Mevzuat ayrıntıları
          </a>
        </div>
      ) : null}
    </div>
  );
}
