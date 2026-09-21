/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * MİKRO FATURALANDIRMA ÖLÇÜM DEFTERİ
 * ------------------------------------------------------------------
 * Her doğrulama çağrısı için motor katmanı, gecikme (ms), müşteri
 * anahtarının özeti ve tutar yazılır. Girdi metni, karar gerekçesi ya
 * da kanıt adımları deftere ASLA girmez (sıfır günlük kuralı).
 */

import {
  amountUsd,
  BILLING_TIERS,
  round6,
  tierForEngine,
  type BillingTier,
} from "@/lib/axiom/billing/tariff";
import { clearRaw, METER_WINDOW_MS, readRaw, writeRaw } from "@/lib/axiom/billing/store";
import type { EngineId, VerifyVerdict } from "@/lib/axiom/verify/types";

export type MeterRecord = {
  /** Kayıt zamanı (epoch ms). */
  at: number;
  tier: BillingTier;
  /** Gerçek motor kimliği; yerel kapı ayrı işaretlenir. */
  engine: EngineId;
  simulated: boolean;
  verdict: VerifyVerdict;
  /** Doğrulama gecikmesi (ms). */
  ms: number;
  /** Müşteri anahtarının kısa özeti; ham anahtar saklanmaz. */
  client: string;
  amount: number;
};

export type TierSummary = {
  tier: BillingTier;
  calls: number;
  amount: number;
  avgMs: number;
};

export type MeterSnapshot = {
  calls: number;
  amount: number;
  lastMs: number;
  p50: number;
  p95: number;
  tiers: TierSummary[];
  /** Son 24 saatlik seri (eski → yeni), her kova bir saat. */
  hourly: { hour: number; calls: number; amount: number }[];
  /** Yerel kural kapısından gelen çağrı sayısı. */
  simulatedCalls: number;
};

type Listener = (snapshot: MeterSnapshot) => void;

let rows: MeterRecord[] = [];
let loaded = false;
const listeners = new Set<Listener>();

/** Müşteri anahtarından geri döndürülemez kısa özet üretir. */
export function clientDigest(key: string | null | undefined): string {
  const input = (key ?? "").trim();
  if (!input) return "anon";
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `c-${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function prune(list: MeterRecord[], now: number): MeterRecord[] {
  return list.filter((r) => now - r.at <= METER_WINDOW_MS);
}

function load(): void {
  if (loaded) return;
  loaded = true;
  rows = prune(readRaw<MeterRecord>().filter(isRecord), Date.now());
}

function isRecord(value: unknown): value is MeterRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as Partial<MeterRecord>;
  return typeof r.at === "number" && typeof r.ms === "number" && typeof r.amount === "number";
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index] ?? 0;
}

export function meterSnapshot(): MeterSnapshot {
  load();
  const now = Date.now();
  rows = prune(rows, now);
  const durations = rows.map((r) => r.ms).sort((a, b) => a - b);
  const tiers: TierSummary[] = BILLING_TIERS.map((tier) => {
    const list = rows.filter((r) => r.tier === tier);
    const sum = list.reduce((acc, r) => acc + r.ms, 0);
    return {
      tier,
      calls: list.length,
      amount: round6(list.reduce((acc, r) => acc + r.amount, 0)),
      avgMs: list.length ? Math.round(sum / list.length) : 0,
    };
  });

  const hourMs = 60 * 60 * 1000;
  const currentHour = Math.floor(now / hourMs);
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const hour = currentHour - 23 + i;
    const list = rows.filter((r) => Math.floor(r.at / hourMs) === hour);
    return {
      hour,
      calls: list.length,
      amount: round6(list.reduce((acc, r) => acc + r.amount, 0)),
    };
  });

  return {
    calls: rows.length,
    amount: round6(rows.reduce((acc, r) => acc + r.amount, 0)),
    lastMs: rows.length ? (rows[rows.length - 1]?.ms ?? 0) : 0,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    tiers,
    hourly,
    simulatedCalls: rows.filter((r) => r.simulated).length,
  };
}

/** Yeni bir doğrulama çağrısını deftere yazar ve dinleyicileri uyarır. */
export function meterRecord(input: {
  engine: EngineId;
  simulated: boolean;
  verdict: VerifyVerdict;
  ms: number;
  client?: string | null;
  omni?: boolean;
  at?: number;
}): MeterRecord {
  load();
  const tier = tierForEngine(input.engine, input.omni ?? false);
  const record: MeterRecord = {
    at: input.at ?? Date.now(),
    tier,
    engine: input.engine,
    simulated: input.simulated,
    verdict: input.verdict,
    ms: Math.max(0, Math.round(input.ms)),
    client: clientDigest(input.client),
    amount: amountUsd(tier),
  };
  rows = prune([...rows, record], record.at);
  writeRaw(rows);
  const snap = meterSnapshot();
  for (const listener of listeners) listener(snap);
  return record;
}

export function meterSubscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Defteri sıfırlar (yalnız yerel; fatura geçmişi tutan bir sunucu yoktur). */
export function meterReset(): void {
  rows = [];
  loaded = true;
  clearRaw();
  const snap = meterSnapshot();
  for (const listener of listeners) listener(snap);
}

/** Testlerin kalıcı depodan bağımsız çalışması için bellek durumunu tazeler. */
export function meterResetForTest(): void {
  rows = [];
  loaded = true;
}
