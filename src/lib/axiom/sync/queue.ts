/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * ÇEVRİMDIŞI DELTA KUYRUĞU
 * ------------------------------------------------------------------
 * Ağ yokken üretilen CRDT deltaları sırayla kuyruğa yazılır; bağlantı
 * gelince gönderilir. Gönderim idempotenttir: aynı delta iki kez
 * ulaşsa da karşı tarafta sonuç değişmez, bu yüzden başarısız gönderim
 * güvenle yeniden denenir.
 */

import type { CrdtDelta } from "@/lib/axiom/sync/crdt";

export type QueuedDelta = {
  /** Kuyruk kimliği: yeniden gönderimde eşleştirme için. */
  id: string;
  at: number;
  delta: CrdtDelta;
  attempts: number;
};

export type QueueState = {
  pending: QueuedDelta[];
  /** Başarıyla gönderilen delta sayısı. */
  sent: number;
  /** Son gönderim denemesi (epoch ms) ya da null. */
  lastFlush: number | null;
};

export function createQueue(): QueueState {
  return { pending: [], sent: 0, lastFlush: null };
}

let seq = 0;

export function enqueue(state: QueueState, delta: CrdtDelta, at = Date.now()): QueueState {
  if (!delta.entries.length) return state;
  seq += 1;
  const item: QueuedDelta = { id: `d-${at}-${seq}`, at, delta, attempts: 0 };
  return { ...state, pending: [...state.pending, item] };
}

export type Sender = (delta: CrdtDelta) => Promise<boolean> | boolean;

/**
 * Kuyruğu boşaltır. Gönderilemeyen kayıtlar kuyrukta kalır ve deneme
 * sayacı artar; sıra korunur.
 */
export async function flush(
  state: QueueState,
  send: Sender,
  online = true,
): Promise<{ state: QueueState; sent: number; failed: number }> {
  if (!online || !state.pending.length) {
    return { state: { ...state, lastFlush: Date.now() }, sent: 0, failed: state.pending.length };
  }
  const remaining: QueuedDelta[] = [];
  let sent = 0;
  for (const item of state.pending) {
    let ok = false;
    try {
      ok = await send(item.delta);
    } catch {
      ok = false;
    }
    if (ok) sent += 1;
    else remaining.push({ ...item, attempts: item.attempts + 1 });
  }
  return {
    state: { pending: remaining, sent: state.sent + sent, lastFlush: Date.now() },
    sent,
    failed: remaining.length,
  };
}
