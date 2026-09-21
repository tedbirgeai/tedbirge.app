/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * SANAL RAM KATMANI (Dynamic Proof-Cache)
 * ------------------------------------------------------------------
 * Katı 50 MB tavanı olan, en az kullanılanı atan (LRU) ispat önbelleği.
 * Kullanım %80 eşiğine (40 MB) ulaştığında tahliye kendiliğinden
 * çalışır; atılan kayıtlar gerektiğinde ROM'dan geri çağrılır.
 *
 * Bilinçli olarak saf TypeScript: hem ana iş parçacığında hem de
 * `kernel.worker.ts` daemon'ında aynı davranışla test edilebilir.
 */

import { AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD } from "@/lib/axiom/brand";

export type RamEntry = {
  key: string;
  /** Kaydın yaklaşık bellek maliyeti (bayt). */
  bytes: number;
  /** Son erişim sırası (monoton artan sayaç). */
  touched: number;
};

export type RamStats = {
  used: number;
  limit: number;
  entries: number;
  /** Bu örnekte RAM'den atılan kayıt sayısı (toplam). */
  evicted: number;
  /** Doluluk oranı (0–1). */
  ratio: number;
};

export class AxiomRam {
  private map = new Map<string, RamEntry>();
  private clock = 0;
  private usedBytes = 0;
  private evictedCount = 0;

  constructor(
    private readonly limit: number = AXIOM_RAM_LIMIT,
    private readonly threshold: number = AXIOM_RAM_THRESHOLD,
  ) {}

  /** Kaydı önbelleğe koyar ve gerekiyorsa LRU tahliyesini çalıştırır. */
  set(key: string, bytes: number): void {
    const cost = Math.max(0, Math.floor(bytes));
    const existing = this.map.get(key);
    if (existing) this.usedBytes -= existing.bytes;
    this.clock += 1;
    this.map.set(key, { key, bytes: cost, touched: this.clock });
    this.usedBytes += cost;
    this.enforce(key);
  }

  /** Kayıt varsa tazeler ve maliyetini döner; yoksa `null`. */
  get(key: string): number | null {
    const hit = this.map.get(key);
    if (!hit) return null;
    this.clock += 1;
    hit.touched = this.clock;
    return hit.bytes;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  delete(key: string): void {
    const hit = this.map.get(key);
    if (!hit) return;
    this.usedBytes -= hit.bytes;
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.usedBytes = 0;
  }

  stats(): RamStats {
    return {
      used: this.usedBytes,
      limit: this.limit,
      entries: this.map.size,
      evicted: this.evictedCount,
      ratio: this.limit > 0 ? this.usedBytes / this.limit : 0,
    };
  }

  /** Eşik aşıldığında en eski kayıtları atar; yeni kayıt korunur. */
  private enforce(keep: string): void {
    const ceiling = this.limit * this.threshold;
    if (this.usedBytes <= ceiling) return;
    const order = [...this.map.values()].sort((a, b) => a.touched - b.touched);
    for (const entry of order) {
      if (this.usedBytes <= ceiling) break;
      if (entry.key === keep) continue;
      this.map.delete(entry.key);
      this.usedBytes -= entry.bytes;
      this.evictedCount += 1;
    }
  }
}
