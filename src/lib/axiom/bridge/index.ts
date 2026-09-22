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
export {
  getBridgeEvents,
  subscribeBridgeEvents,
  recordBridgeEvent,
  type BridgeEvent,
} from "@/lib/axiom/bridge/events";
export { HARD_LIMIT_MS, SOFT_BUDGET_MS, BridgeAbortError } from "@/lib/axiom/bridge/shield";

/**
 * Her isteği 500/750 ms kalkanıyla sarar. Sert sınırda bağlantı kapatılır;
 * çağıran hatayı görür ve yerel motora düşer.
 */
function shielded(
  send: (req: TruthRequest) => Promise<TruthResponse>,
  onHard: () => void,
): (req: TruthRequest) => Promise<TruthResponse> {
  return (req) => withAbortBudget(() => send(req), { onHard });
}

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
    return {
      transport,
      state: bridge.state,
      send: shielded(bridge.send, bridge.close),
      close: bridge.close,
    };
  }

  if (transport === "wss") {
    const bridge: WssBridge = createWssBridge({ onState });
    bridge.connect();
    return {
      transport,
      state: bridge.state,
      // Sert sınırda bağlantı düşürülür; geri çekilme döngüsü yeniden kurar.
      send: shielded(bridge.send, bridge.connect),
      close: bridge.close,
    };
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
