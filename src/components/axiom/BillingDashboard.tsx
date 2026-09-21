/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * B2B MİKRO FATURALANDIRMA PANELİ
 * ------------------------------------------------------------------
 * Motor katmanı kırılımı, canlı gecikme (son / p50 / p95) ve biriken
 * tutar. Defter yalnız bu cihazda tutulur; ödeme sağlayıcısına bağlı
 * değildir (ölçüm kipi).
 */

import { useEffect, useState } from "react";

import { meterSnapshot, meterSubscribe, type MeterSnapshot } from "@/lib/axiom/billing/meter";
import { formatUsd, TARIFF } from "@/lib/axiom/billing/tariff";
import { t } from "@/lib/axiom/i18n";

function Bar({ ratio }: { ratio: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-[var(--tb-bg-soft)]">
      <div
        className="h-full rounded bg-[var(--tb-cyan-400)]"
        style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
      />
    </div>
  );
}

export function BillingDashboard() {
  const [snap, setSnap] = useState<MeterSnapshot>(() => meterSnapshot());

  useEffect(() => {
    setSnap(meterSnapshot());
    const off = meterSubscribe(setSnap);
    const id = window.setInterval(() => setSnap(meterSnapshot()), 5000);
    return () => {
      off();
      window.clearInterval(id);
    };
  }, []);

  const peak = Math.max(1, ...snap.hourly.map((h) => h.calls));

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("bill.title")}
        </div>
        <span className="rounded border border-[var(--tb-border)] px-2 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]">
          {t("bill.measureMode")}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-2">
          <div className="font-osmono text-[10px] text-[var(--tb-muted)]">{t("bill.revenue")}</div>
          <div className="font-osmono text-[15px] text-[var(--tb-cyan-400)]">
            {formatUsd(snap.amount)}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-2">
          <div className="font-osmono text-[10px] text-[var(--tb-muted)]">{t("bill.calls")}</div>
          <div className="font-osmono text-[15px] text-[var(--tb-text)]">{snap.calls}</div>
        </div>
        <div className="rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-soft)] p-2">
          <div className="font-osmono text-[10px] text-[var(--tb-muted)]">{t("bill.latency")}</div>
          <div className="font-osmono text-[15px] text-[var(--tb-text)]">
            {snap.lastMs} ms
            <span className="ml-2 text-[10px] text-[var(--tb-muted)]">
              p50 {snap.p50} · p95 {snap.p95}
            </span>
          </div>
        </div>
      </div>

      <table className="mt-3 w-full font-osmono text-[11px]">
        <thead>
          <tr className="text-left text-[var(--tb-muted)]">
            <th className="py-1">{t("bill.tier")}</th>
            <th className="py-1">{t("bill.unit")}</th>
            <th className="py-1 text-right">{t("bill.calls")}</th>
            <th className="py-1 text-right">{t("bill.avgMs")}</th>
            <th className="py-1 text-right">{t("bill.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {snap.tiers.map((row) => (
            <tr key={row.tier} className="border-t border-[var(--tb-border)] text-[var(--tb-text)]">
              <td className="py-1">{TARIFF[row.tier].label}</td>
              <td className="py-1 text-[var(--tb-muted)]">
                ${TARIFF[row.tier].unitUsd.toFixed(3)}
              </td>
              <td className="py-1 text-right">{row.calls}</td>
              <td className="py-1 text-right">{row.avgMs}</td>
              <td className="py-1 text-right text-[var(--tb-cyan-400)]">{formatUsd(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3">
        <div className="font-osmono text-[10px] text-[var(--tb-muted)]">{t("bill.hourly")}</div>
        <div className="mt-1 flex items-end gap-0.5">
          {snap.hourly.map((h) => (
            <div key={h.hour} className="flex-1" title={`${h.calls} · ${formatUsd(h.amount)}`}>
              <div
                className="w-full rounded-t bg-[var(--tb-cyan-400)]"
                style={{
                  height: `${Math.max(2, (h.calls / peak) * 40)}px`,
                  opacity: h.calls ? 1 : 0.25,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Bar ratio={snap.calls ? snap.simulatedCalls / snap.calls : 0} />
        <div className="mt-1 font-osmono text-[10px] text-[var(--tb-muted)]">
          {t("bill.localShare")}: {snap.simulatedCalls}/{snap.calls}
        </div>
      </div>
    </div>
  );
}
