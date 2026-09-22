/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * ARDIŞIK DURUM ZİNCİRİ (FAZ 3)
 * ------------------------------------------------------------------
 * Her geçiş önceki kök özetine bağlanır. Bağ kopuksa kayıt kabul
 * edilmez: zincir çatallanmaz. Yalnız kanıtlanmış geçişler zincire
 * işlenir; reddedilen, kararsız, zaman aşımına uğramış ve panik
 * yollarındaki geçişler zinciri değiştirmez ve mühür üretmez.
 *
 * Zincirde ham veri yoktur: geçiş türü, özet ve karar taşınır.
 */

import { EMPTY_ROOT, leafDigest, merkleRoot } from "@/lib/axiom/zk/merkle";
import type { VerifyVerdict } from "@/lib/axiom/verify/types";

/** Zincirde tutulacak en fazla geçiş sayısı. */
export const CHAIN_LIMIT = 64;
/** Sıkıştırmadan sonra korunacak taze geçiş sayısı. */
export const CHAIN_KEEP = 16;

export type StateTransition = {
  /** Sıra numarası (1'den başlar). */
  seq: number;
  /** Geçiş türü, ör. "belge.kaydet". */
  kind: string;
  /** Yaprak özeti. */
  leaf: string;
  /** Bağlandığı önceki kök. */
  previousRoot: string;
  /** Bu geçişten sonraki kök. */
  root: string;
  verdict: VerifyVerdict;
  /** Yalnız 200_PROVEN ve canlı motor mührü varsa doludur. */
  seal: string | null;
  ms: number;
  at: number;
};

export type StateChain = {
  root: string;
  leaves: string[];
  transitions: StateTransition[];
  /** Zincire işlenmeyen (reddedilen/kararsız) geçiş sayısı. */
  rejected: number;
  /** Sıkıştırma ile tek köke indirilmiş geçiş sayısı. */
  compacted: number;
};

export function emptyChain(): StateChain {
  return { root: EMPTY_ROOT, leaves: [], transitions: [], rejected: 0, compacted: 0 };
}

export type AppendInput = {
  kind: string;
  /** Durum gövdesinin özeti; ham gövde değil. */
  payloadDigest: string;
  verdict: VerifyVerdict;
  seal: string | null;
  ms: number;
  /** Bilinen önceki kök; uyuşmazsa geçiş reddedilir. */
  expectedPreviousRoot?: string;
  at?: number;
};

export type AppendResult = {
  chain: StateChain;
  accepted: boolean;
  /** Kabul edilmediyse sade Türkçe gerekçe. */
  reason: string | null;
  transition: StateTransition | null;
};

/** Zincire yeni geçiş bağlar. Yalnız kanıtlanmış geçişler kabul edilir. */
export function appendTransition(chain: StateChain, input: AppendInput): AppendResult {
  if (input.expectedPreviousRoot && input.expectedPreviousRoot !== chain.root) {
    return {
      chain: { ...chain, rejected: chain.rejected + 1 },
      accepted: false,
      reason: "Zincir bağı kopuk: geçiş bilinen son duruma bağlanmıyor.",
      transition: null,
    };
  }
  if (input.verdict !== "200_PROVEN" || !input.seal) {
    return {
      chain: { ...chain, rejected: chain.rejected + 1 },
      accepted: false,
      reason:
        input.verdict === "409_REFUTED"
          ? "Geçiş çelişkili bulundu; durum değişmedi."
          : "Geçiş kanıtlanamadı; durum değişmedi.",
      transition: null,
    };
  }

  const leaf = leafDigest(input.kind, input.payloadDigest);
  const leaves = [...chain.leaves, leaf];
  const transition: StateTransition = {
    seq: chain.transitions.length + chain.compacted + 1,
    kind: input.kind,
    leaf,
    previousRoot: chain.root,
    root: merkleRoot(leaves),
    verdict: input.verdict,
    seal: input.seal,
    ms: input.ms,
    at: input.at ?? Date.now(),
  };
  const next: StateChain = {
    root: transition.root,
    leaves,
    transitions: [...chain.transitions, transition],
    rejected: chain.rejected,
    compacted: chain.compacted,
  };
  return { chain: compactChain(next), accepted: true, reason: null, transition };
}

/**
 * Bellek şişmesini önler: sınır aşılınca eski yapraklar tek bir
 * sıkıştırılmış köke indirilir, kök özeti değişmeden korunur.
 */
export function compactChain(chain: StateChain): StateChain {
  if (chain.transitions.length <= CHAIN_LIMIT) return chain;
  const dropped = chain.transitions.length - CHAIN_KEEP;
  return {
    root: chain.root,
    // Sıkıştırılmış geçmiş tek bir özet yaprağa indirilir; kök yine doğrulanabilir.
    leaves: [chain.root, ...chain.leaves.slice(dropped)],
    transitions: chain.transitions.slice(dropped),
    rejected: chain.rejected,
    compacted: chain.compacted + dropped,
  };
}

let current: StateChain = emptyChain();
const listeners = new Set<() => void>();

/** Aynı referansı döndürür: useSyncExternalStore döngüye girmez. */
export function getChain(): StateChain {
  return current;
}

export function subscribeChain(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Zincire geçiş işler ve dinleyicileri uyarır. */
export function recordTransition(input: AppendInput): AppendResult {
  const result = appendTransition(current, input);
  current = result.chain;
  listeners.forEach((fn) => fn());
  return result;
}

export function resetChain(): void {
  current = emptyChain();
  listeners.forEach((fn) => fn());
}
