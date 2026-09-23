/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * SALGIN YAYILIM PROTOKOLÜ (Gossip)
 * ------------------------------------------------------------------
 * Bir düğüm elindeki durum özetini tüm ağa değil, rastgele seçilmiş
 * küçük bir eş kümesine (fanout) fısıldar. Onlar da aynı şeyi yapar;
 * bilgi ağa logaritmik adımda yayılır ve tek bir düğüm çökse bile
 * yayılım durmaz.
 *
 * Üç koruma birlikte çalışır:
 *   · Tekrar kalkanı — aynı paket ikinci kez yayılmaz (idempotent).
 *   · Atlama bütçesi — ttl biterse paket düşer (fırtına önleme).
 *   · Değişmez kapısı — çelişkili paket ağ seviyesinde imha edilir.
 */

import { gatePacketClaim, type GateDecision } from "@/lib/axiom/net/packet-gate";
import type { VectorClock } from "@/lib/axiom/sync/vector-clock";
import { mergeClocks } from "@/lib/axiom/sync/vector-clock";

/** Bir turda fısıldanan eş sayısı. */
export const GOSSIP_FANOUT = 3;

/** Paketin azami atlama bütçesi. */
export const GOSSIP_TTL = 4;

/** Tekrar kalkanında tutulan paket kimliği tavanı. */
export const SEEN_LIMIT = 2048;

export type GossipPacket = {
  /** Paket kimliği — tekrar kalkanının anahtarı. */
  id: string;
  /** Paketi üreten düğüm. */
  origin: string;
  /** Kalan atlama bütçesi. */
  ttl: number;
  at: number;
  clock: VectorClock;
  /** Taşınan yük: özet ve isteğe bağlı iddia metni. */
  digest: string;
  claim?: string;
};

export type GossipState = {
  node: string;
  clock: VectorClock;
  seen: string[];
  /** Yayılan paket sayısı. */
  spread: number;
  /** Tekrar kalkanına takılan paket sayısı. */
  duplicates: number;
  /** Değişmez kapısında imha edilen paket sayısı. */
  dropped: number;
};

export function createGossip(node: string, clock: VectorClock = {}): GossipState {
  return { node, clock, seen: [], spread: 0, duplicates: 0, dropped: 0 };
}

/**
 * Fısıldanacak eşleri seçer. Rastgelelik enjekte edilebilir; testlerde
 * sabit üreteçle deterministik sonuç alınır.
 */
export function selectPeers(
  peers: readonly string[],
  fanout = GOSSIP_FANOUT,
  random: () => number = Math.random,
): string[] {
  const pool = [...new Set(peers)].filter(Boolean);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1)) % (i + 1);
    const tmp = pool[i] as string;
    pool[i] = pool[j] as string;
    pool[j] = tmp;
  }
  return pool.slice(0, Math.max(0, fanout));
}

export type GossipOutcome = {
  state: GossipState;
  /** İleri yayılacak paket (ttl bir azaltılmış) ya da null. */
  forward: GossipPacket | null;
  /** Yerel duruma uygulandı mı? */
  applied: boolean;
  gate: GateDecision;
};

function remember(seen: readonly string[], id: string): string[] {
  const next = [...seen, id];
  return next.length > SEEN_LIMIT ? next.slice(next.length - SEEN_LIMIT) : next;
}

/** Gelen paketi işler: tekrar kalkanı → değişmez kapısı → saat birleşimi. */
export function receivePacket(state: GossipState, packet: GossipPacket): GossipOutcome {
  const okGate: GateDecision = { accepted: true, reason: "Paket kabul edildi.", code: "OK" };
  if (state.seen.includes(packet.id)) {
    return {
      state: { ...state, duplicates: state.duplicates + 1 },
      forward: null,
      applied: false,
      gate: okGate,
    };
  }
  const gate = gatePacketClaim(packet.claim);
  if (!gate.accepted) {
    return {
      state: { ...state, seen: remember(state.seen, packet.id), dropped: state.dropped + 1 },
      forward: null,
      applied: false,
      gate,
    };
  }
  const next: GossipState = {
    ...state,
    clock: mergeClocks(state.clock, packet.clock),
    seen: remember(state.seen, packet.id),
    spread: state.spread + 1,
  };
  const ttl = packet.ttl - 1;
  return {
    state: next,
    forward: ttl > 0 ? { ...packet, ttl } : null,
    applied: true,
    gate,
  };
}

let seq = 0;

/** Yerel bir yayın paketi üretir. */
export function createPacket(
  state: GossipState,
  digest: string,
  claim?: string,
  at = Date.now(),
): GossipPacket {
  seq += 1;
  return {
    id: `${state.node}:${at}:${seq}`,
    origin: state.node,
    ttl: GOSSIP_TTL,
    at,
    clock: state.clock,
    digest,
    ...(claim ? { claim } : {}),
  };
}

/** Test/oturum sıfırlaması. */
export function resetGossipSeq(): void {
  seq = 0;
}
