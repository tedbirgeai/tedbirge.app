/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { PlanTier } from "./tariff";

/**
 * ÖLÇÜM DEFTERİ KALICILIĞI & DURUM YÖNETİMİ
 * ------------------------------------------------------------------
 * Defter ve aktif abonelik kademesi yalnız cihazda saklanır (tarayıcı yerel deposu).
 * Sunucu tarafında (SSR / Worker) depolama yoktur: okuma varsayılan değerleri döndürür,
 * yazma sessizce yok sayılır. Kayıtlarda girdi metni ya da müşteri kimliği
 * bulunmaz; yalnız anahtar özeti taşınır.
 */

export const METER_STORE_KEY = "axiom.meter.v1";
export const PLAN_STORE_KEY = "axiom.plan.v1";

/** 30 günlük pencere (ms). Daha eski kayıtlar okuma sırasında düşer. */
export const METER_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

// ==========================================
// 1. ÖLÇÜM DEFTERİ RAW İŞLEMLERİ (MEVCUT YAPI)
// ==========================================

export function readRaw<T>(): T[] {
  const s = storage();
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s.getItem(METER_STORE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeRaw<T>(rows: T[]): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(METER_STORE_KEY, JSON.stringify(rows));
  } catch {
    /* kota dolu olabilir: defter bellekte sürer */
  }
}

export function clearRaw(): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(METER_STORE_KEY);
  } catch {
    /* yoksay */
  }
}

// ==========================================
// 2. AXIOM V12 ABONELİK & PLAN DURUMU (YENİ)
// ==========================================

/** Cihazda saklanan aktif abonelik kademesini okur. Varsayılan: COMMUNITY */
export function getStoredPlanTier(): PlanTier {
  const s = storage();
  if (!s) return "COMMUNITY";
  try {
    const tier = s.getItem(PLAN_STORE_KEY) as PlanTier | null;
    if (tier && ["COMMUNITY", "DEVELOPER", "PRO", "ENTERPRISE", "SOVEREIGN"].includes(tier)) {
      return tier;
    }
    return "COMMUNITY";
  } catch {
    return "COMMUNITY";
  }
}

/** Aktif abonelik kademesini günceller ve yerel depoya kaydeder. */
export function setStoredPlanTier(tier: PlanTier): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(PLAN_STORE_KEY, tier);
  } catch {
    /* yoksay */
  }
}
