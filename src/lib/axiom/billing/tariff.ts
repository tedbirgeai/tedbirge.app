/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * B2B TARİFE TABLOSU
 * ------------------------------------------------------------------
 * Harici LLM istemcilerinden gelen her doğrulama çağrısı, kullanılan
 * motorun katmanına göre ücretlendirilir. Bu tablo tek doğruluk
 * kaynağıdır; arayüz ve ölçüm defteri buradan okur.
 *
 * Tutarlar ölçüm amaçlıdır: hiçbir ödeme sağlayıcısına bağlı değildir.
 */

import type { EngineId } from "@/lib/axiom/verify/types";

/** Ücretlendirme katmanları. */
export type BillingTier = "z3" | "lean4" | "omni";

export const TARIFF: Record<BillingTier, { label: string; unitUsd: number }> = {
  z3: { label: "Z3 SMT", unitUsd: 0.001 },
  lean4: { label: "Lean 4", unitUsd: 0.01 },
  omni: { label: "Omni-Science", unitUsd: 0.05 },
};

export const BILLING_TIERS: BillingTier[] = ["z3", "lean4", "omni"];

/** Para birimi. Tek kur, dönüşüm yok. */
export const BILLING_CURRENCY = "USD";

/**
 * Motor kimliğini ücret katmanına eşler. `mock` motoru (WASM ikilisi
 * yüklü değilken) en düşük katman üzerinden ölçülür; tutar yine de
 * yalnız sayaç amaçlıdır.
 */
export function tierForEngine(engine: EngineId, omni = false): BillingTier {
  if (omni) return "omni";
  if (engine === "lean4") return "lean4";
  return "z3";
}

/** Tek çağrının tutarı (USD). Altı haneye yuvarlanır. */
export function amountUsd(tier: BillingTier, calls = 1): number {
  return round6(TARIFF[tier].unitUsd * calls);
}

/** Muhasebe yuvarlaması: kuruş altı birikimlerde kayma olmaması için 6 hane. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

/** Panelde gösterilecek biçim: 4 ondalık (mikro faturalandırma). */
export function formatUsd(value: number): string {
  return `$${value.toFixed(4)}`;
}
