/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * BELLEK PROFİLİ
 * ------------------------------------------------------------------
 * `performance.memory` varsa gerçek JS yığın ölçümü okunur; yoksa
 * sanal RAM defterinden tahmini değer üretilir ve bu durum arayüzde
 * "tahmini" olarak işaretlenir (asla gerçek ölçüm gibi gösterilmez).
 */

export type MemorySample = {
  usedBytes: number;
  limitBytes: number;
  /** Ölçüm gerçek tarayıcı API'sinden mi geldi? */
  measured: boolean;
};

type HeapInfo = { usedJSHeapSize: number; jsHeapSizeLimit: number };

/** Tarayıcı bellek ölçümünü okur; desteklenmiyorsa `null`. */
export function readHeap(): HeapInfo | null {
  if (typeof performance === "undefined") return null;
  const mem = (performance as unknown as { memory?: Partial<HeapInfo> }).memory;
  if (!mem || typeof mem.usedJSHeapSize !== "number" || typeof mem.jsHeapSizeLimit !== "number") {
    return null;
  }
  return { usedJSHeapSize: mem.usedJSHeapSize, jsHeapSizeLimit: mem.jsHeapSizeLimit };
}

/** Gerçek ölçüm yoksa sanal RAM defterine düşen örnek. */
export function sampleMemory(fallbackUsed: number, fallbackLimit: number): MemorySample {
  const heap = readHeap();
  if (heap) {
    return { usedBytes: heap.usedJSHeapSize, limitBytes: heap.jsHeapSizeLimit, measured: true };
  }
  return { usedBytes: fallbackUsed, limitBytes: fallbackLimit, measured: false };
}

/** Eşik aşıldı mı? (tahliye tetikleyicisi) */
export function overThreshold(used: number, limit: number, threshold: number): boolean {
  if (limit <= 0) return false;
  return used / limit >= threshold;
}

/** Bayt değerini okunur birime çevirir. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}
