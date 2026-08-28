/**
 * ZARF DOĞRULAMA KASASI (Guard) — Faz B
 * ------------------------------------------------------------------
 * Gelen her paket tek bir kapıdan geçer. Kapı üç şeyi birden denetler:
 *   1) İmza — gönderen gerçekten o mu?
 *   2) Tekrar penceresi — çok eski ya da gelecekten gelen paket kabul
 *      edilmez (replay saldırısı).
 *   3) Mükerrer özet — aynı paket ikinci kez işlenmez.
 *
 * Sayaçlar panele bağlanır; sessiz düşürme yoktur, her düşürmenin
 * okunabilir bir gerekçesi vardır.
 */

import { verifyEnvelope, type MeshEnvelopeV2 } from "@/lib/mesh-envelope";

/** Kabul penceresi: paket damgası bu aralığın dışındaysa reddedilir. */
export const REPLAY_PAST_MS = 10 * 60_000;
export const REPLAY_FUTURE_MS = 2 * 60_000;

/** Bellek içi mükerrer filtresi (kalıcı depo yanında hızlı ön eleme). */
const RECENT_LIMIT = 4096;
const recent = new Set<string>();

export type GuardVerdict =
  | { ok: true }
  | { ok: false; reason: "unsigned" | "replay" | "duplicate" | "malformed"; note: string };

export type GuardStats = {
  accepted: number;
  unsigned: number;
  replay: number;
  duplicate: number;
  malformed: number;
  lastReason: string | null;
  lastAt: number | null;
};

let stats: GuardStats = {
  accepted: 0,
  unsigned: 0,
  replay: 0,
  duplicate: 0,
  malformed: 0,
  lastReason: null,
  lastAt: null,
};

const listeners = new Set<() => void>();

export function onGuardStats(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function guardStats(): GuardStats {
  return stats;
}

export function resetGuard() {
  recent.clear();
  stats = {
    accepted: 0,
    unsigned: 0,
    replay: 0,
    duplicate: 0,
    malformed: 0,
    lastReason: null,
    lastAt: null,
  };
  for (const fn of listeners) fn();
}

function remember(pktId: string) {
  recent.add(pktId);
  if (recent.size > RECENT_LIMIT) {
    // En eski kayıtlar sırayla düşer (Set ekleme sırasını korur).
    const drop = recent.size - RECENT_LIMIT;
    let i = 0;
    for (const key of recent) {
      recent.delete(key);
      if (++i >= drop) break;
    }
  }
}

function fail(reason: Exclude<GuardVerdict, { ok: true }>["reason"], note: string): GuardVerdict {
  stats = { ...stats, [reason]: stats[reason] + 1, lastReason: note, lastAt: Date.now() };
  for (const fn of listeners) fn();
  return { ok: false, reason, note };
}

/**
 * Tek nokta: paket işlenmeli mi? `now` yalnız testler için dışarıdan verilir.
 */
export function admitEnvelope(env: MeshEnvelopeV2 | null, now = Date.now()): GuardVerdict {
  if (!env?.h?.pktId) return fail("malformed", "Paket biçimi tanınmadı.");
  if (recent.has(env.h.pktId)) return fail("duplicate", "Aynı paket ikinci kez geldi.");

  const ts = Number(env.h.ts);
  if (!Number.isFinite(ts) || ts < now - REPLAY_PAST_MS || ts > now + REPLAY_FUTURE_MS)
    return fail("replay", "Paket zaman penceresinin dışında.");

  if (!verifyEnvelope(env)) return fail("unsigned", "İmza doğrulanamadı.");

  remember(env.h.pktId);
  stats = { ...stats, accepted: stats.accepted + 1, lastAt: now };
  for (const fn of listeners) fn();
  return { ok: true };
}
