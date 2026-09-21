/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * P2P HESAPLAMA ÖDÜLLERİ (AĞ KREDİSİ)
 * ------------------------------------------------------------------
 * Doğrulama işini üstlenen düğüm, katman başına ağ kredisi kazanır.
 * Kredi para değildir, devredilemez; yalnız ağ içi kota ve öncelik
 * belirler. Gerçek bir ödül ağı bulunmadığından hesap BENZETİMDİR.
 */

import { BILLING_TIERS, type BillingTier } from "@/lib/axiom/billing/tariff";
import type { MeterSnapshot } from "@/lib/axiom/billing/meter";

/** Katman başına kredi ağırlığı (çağrı × ağırlık). */
export const CREDIT_WEIGHT: Record<BillingTier, number> = { z3: 1, lean4: 8, omni: 40 };

export type RewardsSummary = {
  /** Toplam kazanılan ağ kredisi. */
  credits: number;
  /** Ödüle sayılan doğrulama sayısı. */
  verified: number;
  perTier: { tier: BillingTier; calls: number; credits: number }[];
  /** Hakem denetiminden geçmiş (2/3 çoğunluk) doğrulama sayısı. */
  quorumPassed: number;
  simulated: true;
};

export function rewardsFrom(snapshot: MeterSnapshot, quorumPassed = 0): RewardsSummary {
  const perTier = BILLING_TIERS.map((tier) => {
    const calls = snapshot.tiers.find((t) => t.tier === tier)?.calls ?? 0;
    return { tier, calls, credits: calls * CREDIT_WEIGHT[tier] };
  });
  return {
    credits: perTier.reduce((acc, t) => acc + t.credits, 0),
    verified: snapshot.calls,
    perTier,
    quorumPassed,
    simulated: true,
  };
}
