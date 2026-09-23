/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import type { EngineId } from "@/lib/axiom/verify/types";

/**
 * AXIOM™ V12 GELİR & TARİFE TABLOSU
 * ------------------------------------------------------------------
 * Hem 5 kademeli B2B abonelik paketlerini hem de motor bazlı
 * mikro-doğrulama çağrı ücretlerini yöneten ana şema.
 */

// 1. B2B Abonelik Kademeleri (Plan Tiers)
export type PlanTier = 'COMMUNITY' | 'DEVELOPER' | 'PRO' | 'ENTERPRISE' | 'SOVEREIGN';

export interface PlanConfig {
  monthlyFee: number;
  includedQuota: number;
  extraCostPerProof: number;
  features: string[];
}

export const AXIOM_TIERS: Record<PlanTier, PlanConfig> = {
  COMMUNITY: {
    monthlyFee: 0,
    includedQuota: 100,
    extraCostPerProof: 0,
    features: ["Browser Extension (Right-Click)", "Basic AST & Type Check"]
  },
  DEVELOPER: {
    monthlyFee: 10,
    includedQuota: 10000,
    extraCostPerProof: 0.001,
    features: ["MCP Server Access", "Local WASM Kernel", "Z3 SMT Basic Logic"]
  },
  PRO: {
    monthlyFee: 49,
    includedQuota: 65000,
    extraCostPerProof: 0.0008,
    features: ["Lean 4 Simulator", "Custom API Key", "Universal Gateway", "5 Team Members"]
  },
  ENTERPRISE: {
    monthlyFee: 499,
    includedQuota: 1000000,
    extraCostPerProof: 0.0004,
    features: ["Dedicated Gateway Node", "99.99% SLA", "SSRF Shield", "ZK Merkle Chain"]
  },
  SOVEREIGN: {
    monthlyFee: 0, // Özel Teklif / Custom Quote
    includedQuota: Infinity,
    extraCostPerProof: 0.0001,
    features: ["Air-Gapped On-Premise", "Custom C-ABI Hardware Enclave", "24/7 SLA"]
  }
};

// 2. Motor Bazlı Ölçüm Katmanları (Engine Billing Tiers)
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
 * Motor kimliğini ücret katmanına eşler.
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
