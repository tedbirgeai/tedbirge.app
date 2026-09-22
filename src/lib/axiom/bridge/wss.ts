/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * TARAYICI YEDEĞİ — GÜVENLİ WEBSOCKET KÖPRÜSÜ
 * ------------------------------------------------------------------
 * Unix soketi tarayıcıda yoktur; bu köprü wss:// üzerinden aynı
 * sözleşmeyi taşır. Sunucu yoksa uydurma bağlantı gösterilmez:
 * durum "sunucu bekleniyor" olarak kalır ve istekler kuyrukta bekler.
 */

import { handleEventFrame, recordBridgeEvent } from "@/lib/axiom/bridge/events";
import {
  backoffMs,
  BRIDGE_MAX_ATTEMPTS,
  initialBridgeState,
  TRUTH_WSS_URL,
  type BridgeState,
  type TruthRequest,
  type TruthResponse,
} from "@/lib/axiom/bridge/types";

/** Test edilebilirlik için yalnız kullandığımız yüzey. */
export type WsLike = {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  onmessage: ((ev: { data: string }) => void) | null;
};

export type WssBridgeOptions = {
  url?: string;
  factory?: (url: string) => WsLike;
  onState?: (state: BridgeState) => void;
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => void;
};

export type WssBridge = {
  state(): BridgeState;
  connect(): void;
  send(req: TruthRequest): Promise<TruthResponse>;
  close(): void;
};

export function createWssBridge(options: WssBridgeOptions = {}): WssBridge {
  const url = options.url ?? TRUTH_WSS_URL;
  const now = options.now ?? (() => Date.now());
  const schedule =
    options.schedule ??
    ((fn: () => void, ms: number) => {
      if (typeof setTimeout !== "undefined") setTimeout(fn, ms);
    });
  const factory =
    options.factory ?? ((target: string) => new WebSocket(target) as unknown as WsLike);

  let socket: WsLike | null = null;
  let closed = false;
  let state = initialBridgeState("wss");
  const queue: TruthRequest[] = [];
  const waiting = new Map<number, { resolve: (r: TruthResponse) => void; at: number }>();

  const emit = (patch: Partial<BridgeState>) => {
    state = { ...state, ...patch, pending: waiting.size };
    options.onState?.(state);
  };

  const pump = () => {
    if (!socket || !state.connected) return;
    while (queue.length) {
      const req = queue.shift();
      if (!req) break;
      const slot = waiting.get(req.id);
      if (slot) waiting.set(req.id, { resolve: slot.resolve, at: now() });
      socket.send(JSON.stringify(req));
    }

    emit({});
  };

  const connect = () => {
    if (closed || socket) return;
    let ws: WsLike;
    try {
      ws = factory(url);
    } catch {
      emit({ connected: false, attempts: state.attempts + 1, note: "Sunucu bekleniyor" });
      return;
    }
    socket = ws;
    ws.onopen = () => {
      emit({ connected: true, note: "Köprü bağlı" });
      recordBridgeEvent("connected");
      pump();
    };
    ws.onmessage = (ev) => {
      let msg: TruthResponse | null = null;
      try {
        msg = JSON.parse(String(ev.data)) as TruthResponse;
      } catch {
        return;
      }
      const slot = waiting.get(msg.id);
      if (!slot) {
        // İstek numarası olmayan bildirim: olay akışına düşer.
        handleEventFrame(msg);
        return;
      }
      waiting.delete(msg.id);
      emit({ latencyMs: Math.max(0, Math.round(now() - slot.at)) });
      slot.resolve(msg);
    };
    const drop = () => {
      socket = null;
      const attempts = state.attempts + 1;
      emit({ connected: false, attempts, note: "Sunucu bekleniyor" });
      recordBridgeEvent(attempts < BRIDGE_MAX_ATTEMPTS ? "retry" : "disconnected");
      if (!closed && attempts < BRIDGE_MAX_ATTEMPTS) schedule(connect, backoffMs(attempts));
    };
    ws.onerror = drop;
    ws.onclose = drop;
  };

  return {
    state: () => state,
    connect,
    send(req) {
      return new Promise<TruthResponse>((resolve) => {
        waiting.set(req.id, { resolve, at: now() });
        if (socket && state.connected) {
          socket.send(JSON.stringify(req));
          emit({});
          return;
        }
        queue.push(req);
        emit({});
        connect();
      });
    },
    close() {
      closed = true;
      socket?.close();
      socket = null;
      emit({ connected: false, note: "Köprü kapatıldı" });
    },
  };
}
