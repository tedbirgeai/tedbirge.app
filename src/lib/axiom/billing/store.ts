/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * ÖLÇÜM DEFTERİ KALICILIĞI
 * ------------------------------------------------------------------
 * Defter yalnız cihazda saklanır (tarayıcı yerel deposu). Sunucu
 * tarafında (SSR / Worker) depolama yoktur: okuma boş dizi, yazma
 * sessizce yok sayılır. Kayıtlarda girdi metni ya da müşteri kimliği
 * bulunmaz; yalnız anahtar özeti taşınır.
 */

export const METER_STORE_KEY = "axiom.meter.v1";

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
