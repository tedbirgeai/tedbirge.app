/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * Bellek içi sabit-pencereli hız sınırı. Ağ Geçidi köprüleri için
 * hafif ve bağımlılıksız kalır; süreç yeniden başlarsa sayaç sıfırlanır.
 */

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function checkRate(
  key: string,
  limit = 60,
  windowMs = 60_000,
  now = Date.now(),
): RateLimitResult {
  const b = buckets.get(key);
  if (!b || now - b.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((windowMs - (now - b.windowStart)) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

export function __resetRateLimit(): void {
  buckets.clear();
}
