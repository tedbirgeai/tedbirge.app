/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * MASAÜSTÜ / BARE-METAL — UNIX ALAN SOKETİ KÖPRÜSÜ
 * ------------------------------------------------------------------
 * Yalnız sunucu/masaüstü tarafında yüklenir (dosya adı *.server.ts
 * olduğu için tarayıcı paketine girmez). Çerçeveleme: her istek ve
 * yanıt tek satır JSON (satır sonu ile ayrılır).
 */

import { handleEventFrame, recordBridgeEvent } from "@/lib/axiom/bridge/events";
import {
  initialBridgeState,
  TRUTH_SOCKET_PATH,
  type BridgeState,
  type TruthRequest,
  type TruthResponse,
} from "@/lib/axiom/bridge/types";
import { VERIFY_TIMEOUT_MS } from "@/lib/axiom/verify/types";

export type SocketBridge = {
  state(): BridgeState;
  send(req: TruthRequest): Promise<TruthResponse>;
  close(): void;
};

/** Soket yolu: ortam değişkeni varsa o, yoksa varsayılan. */
export function socketPath(): string {
  return process.env["TEDBIRGE_TRUTH_SOCK"] ?? TRUTH_SOCKET_PATH;
}

/**
 * Soketi açar. Soket yoksa bağlanma başarısız olur ve durum
 * "sunucu bekleniyor" kalır; çağıran yerel motora düşer.
 */
export async function openSocketBridge(): Promise<SocketBridge> {
  const net = await import("node:net");
  let state = initialBridgeState("unix");
  const waiting = new Map<number, (r: TruthResponse) => void>();
  let buffer = "";

  const socket = net.createConnection(socketPath());
  socket.setEncoding("utf8");
  socket.on("connect", () => {
    state = { ...state, connected: true, note: "Köprü bağlı (yerel soket)" };
    recordBridgeEvent("connected");
  });
  socket.on("error", () => {
    state = { ...state, connected: false, attempts: state.attempts + 1, note: "Sunucu bekleniyor" };
    recordBridgeEvent("retry");
  });
  socket.on("close", () => {
    state = { ...state, connected: false, note: "Sunucu bekleniyor" };
    recordBridgeEvent("disconnected");
  });
  socket.on("data", (chunk: string) => {
    buffer += chunk;
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      index = buffer.indexOf("\n");
      if (!line) continue;
      try {
        const msg = JSON.parse(line) as TruthResponse;
        const resolve = waiting.get(msg.id);
        if (resolve) {
          waiting.delete(msg.id);
          resolve(msg);
        } else {
          // İstek numarası olmayan satır: sistem tarafının kendiliğinden
          // gönderdiği kesme bildirimi. Olay akışına düşer.
          handleEventFrame(msg);
        }
      } catch {
        /* bozuk çerçeve yok sayılır; günlük tutulmaz */
      }
    }
  });

  // Tek soket üzerinde eşzamanlı istekler sıraya alınır: C tarafındaki
  // io_lock mutex'inin JavaScript karşılığı. Çerçeveler karışmaz.
  let chain: Promise<unknown> = Promise.resolve();

  function sendOne(req: TruthRequest): Promise<TruthResponse> {
    return new Promise<TruthResponse>((resolve, reject) => {
      if (!state.connected) {
        reject(new Error("Yerel gerçeklik soketi bağlı değil"));
        return;
      }
      // Sert bütçe: yanıt gelmezse istek kuyruktan düşürülür.
      const timer = setTimeout(() => {
        waiting.delete(req.id);
        reject(new Error("Köprü zaman aşımı"));
      }, VERIFY_TIMEOUT_MS);
      waiting.set(req.id, (msg) => {
        clearTimeout(timer);
        resolve(msg);
      });
      socket.write(`${JSON.stringify(req)}\n`);
    });
  }

  return {
    state: () => state,
    send(req) {
      const next = chain.then(
        () => sendOne(req),
        () => sendOne(req),
      );
      chain = next.catch(() => undefined);
      return next;
    },
    close() {
      socket.destroy();
      state = { ...state, connected: false, note: "Köprü kapatıldı" };
    },
  };
}
