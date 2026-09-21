/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * GERÇEKLİK KÖPRÜSÜ — ORTAK TİPLER
 * ------------------------------------------------------------------
 * Masaüstü/bare-metal ortamında Unix alan soketi (tedbirge_truth.sock),
 * tarayıcıda güvenli WebSocket kullanılır. Her iki taşıyıcı da MCP
 * `axiom.verify` sözleşmesinin aynısını taşır; hiçbir yerde girdi metni
 * kaydedilmez.
 */

import type { EngineId, VerifyVerdict } from "@/lib/axiom/verify/types";

export type BridgeTransport = "unix" | "wss" | "none";

/** Masaüstü/bare-metal soket yolu. */
export const TRUTH_SOCKET_PATH = "/run/tedbirge/tedbirge_truth.sock";

/** Tarayıcı yedeği. */
export const TRUTH_WSS_URL = "wss://tedbirge.dev/ws";

/** C-ABI ve soket çerçevesi sürümü. */
export const BRIDGE_ABI_VERSION = 1;

/** En fazla yeniden bağlanma denemesi; sonra "sunucu bekleniyor" kalır. */
export const BRIDGE_MAX_ATTEMPTS = 5;

export type TruthRequest = {
  id: number;
  method: "axiom.verify";
  text: string;
};

export type TruthResponse = {
  id: number;
  verdict: VerifyVerdict;
  engine: EngineId;
  wasmVerified: boolean;
  simulated: boolean;
  ms: number;
  cid: string;
  seal: string | null;
};

export type BridgeState = {
  transport: BridgeTransport;
  connected: boolean;
  /** Bağlanma denemesi sayısı. */
  attempts: number;
  /** Son yanıt gecikmesi (ms) ya da null. */
  latencyMs: number | null;
  /** Kuyrukta bekleyen istek sayısı. */
  pending: number;
  /** Kullanıcıya gösterilen düz Türkçe durum metni. */
  note: string;
};

export function initialBridgeState(transport: BridgeTransport = "none"): BridgeState {
  return {
    transport,
    connected: false,
    attempts: 0,
    latencyMs: null,
    pending: 0,
    note: transport === "none" ? "Köprü kapalı · yerel motor kullanılıyor" : "Sunucu bekleniyor",
  };
}

/** Ortama göre taşıyıcı seçimi: soket varsa soket, yoksa WebSocket. */
export function pickTransport(env: { hasUnix: boolean; hasWebSocket: boolean }): BridgeTransport {
  if (env.hasUnix) return "unix";
  if (env.hasWebSocket) return "wss";
  return "none";
}

/** Üstel geri çekilme: 500 ms → 15 s arası. */
export function backoffMs(attempt: number): number {
  const base = 500 * 2 ** Math.max(0, attempt - 1);
  return Math.min(base, 15_000);
}
