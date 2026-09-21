/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * P2P HESAPLAMA ÖDÜL KARTI
 * ------------------------------------------------------------------
 * Doğrulama işini üstlenen düğümün kazandığı ağ kredisi. Kredi para
 * değildir, devredilemez; yalnız ağ içi kota ve öncelik belirler.
 */

import { useEffect, useState } from "react";

import { meterSnapshot, meterSubscribe, type MeterSnapshot } from "@/lib/axiom/billing/meter";
import { TARIFF } from "@/lib/axiom/billing/tariff";
import { t } from "@/lib/axiom/i18n";
import { CREDIT_WEIGHT, rewardsFrom } from "@/lib/axiom/net/rewards";

export function RewardsCard({ quorumPassed = 0 }: { quorumPassed?: number }) {
  const [snap, setSnap] = useState<MeterSnapshot>(() => meterSnapshot());

  useEffect(() => {
    setSnap(meterSnapshot());
    return meterSubscribe(setSnap);
  }, []);

  const rewards = rewardsFrom(snap, quorumPassed);

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("rew.title")}
        </div>
        <span className="rounded border border-[var(--tb-border)] px-2 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]">
          {t("rew.active")}
        </span>
      </div>

      <div className="mt-2 font-osmono text-[18px] text-[var(--tb-cyan-400)]">
        {rewards.credits}{" "}
        <span className="text-[11px] text-[var(--tb-muted)]">{t("rew.unit")}</span>
      </div>

      <ul className="mt-2 space-y-1 font-osmono text-[11px]">
        {rewards.perTier.map((row) => (
          <li key={row.tier} className="flex justify-between gap-3">
            <span className="text-[var(--tb-muted)]">
              {TARIFF[row.tier].label} · ×{CREDIT_WEIGHT[row.tier]}
            </span>
            <span className="text-[var(--tb-text)]">
              {row.calls} → {row.credits}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">
        {t("rew.quorum")}: {rewards.quorumPassed} · {t("rew.note")}
      </div>
    </div>
  );
}
