/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * GERÇEKLİK KÖPRÜSÜ — ORTAM SEÇİCİ
 * ------------------------------------------------------------------
 * Masaüstü/bare-metal: Unix alan soketi. Tarayıcı: güvenli WebSocket.
 * Hiçbiri yoksa köprü "none" kalır ve doğrulama mevcut yerel motorda
 * (local-kernel) sürer — arayüz hiçbir durumda çökmez.
 */

import { withAbortBudget } from "@/lib/axiom/bridge/shield";
import { createWssBridge, type WssBridge } from "@/lib/axiom/bridge/wss";
import {
  initialBridgeState,
  pickTransport,
  type BridgeState,
  type BridgeTransport,
  type TruthRequest,
  type TruthResponse,
} from "@/lib/axiom/bridge/types";

export * from "@/lib/axiom/bridge/types";

export type TruthBridge = {
  transport: BridgeTransport;
  state(): BridgeState;
  send(req: TruthRequest): Promise<TruthResponse>;
  close(): void;
};

/** Ortam yetenekleri: Node soketi mi, tarayıcı WebSocket'i mi? */
export function detectEnv(): { hasUnix: boolean; hasWebSocket: boolean } {
  const hasWindow = typeof window !== "undefined";
  const hasUnix =
    !hasWindow && typeof process !== "undefined" && Boolean(process.versions?.node ?? false);
  const hasWebSocket = hasWindow && typeof WebSocket !== "undefined";
  return { hasUnix, hasWebSocket };
}

/** Uygun taşıyıcıyı açar. Bağlanamazsa durum "sunucu bekleniyor" olur. */
export async function openTruthBridge(
  onState?: (state: BridgeState) => void,
): Promise<TruthBridge> {
  const transport = pickTransport(detectEnv());

  if (transport === "unix") {
    const mod = await import("@/lib/axiom/bridge/socket.server");
    const bridge = await mod.openSocketBridge();
    onState?.(bridge.state());
    return { transport, ...bridge };
  }

  if (transport === "wss") {
    const bridge: WssBridge = createWssBridge({ onState });
    bridge.connect();
    return { transport, state: bridge.state, send: bridge.send, close: bridge.close };
  }

  const state = initialBridgeState("none");
  onState?.(state);
  return {
    transport,
    state: () => state,
    send: () => Promise.reject(new Error("Köprü kapalı")),
    close: () => undefined,
  };
}
