/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import { describe, expect, it } from "vitest";

import {
  backoffMs,
  initialBridgeState,
  pickTransport,
  TRUTH_SOCKET_PATH,
  TRUTH_WSS_URL,
  type TruthRequest,
} from "@/lib/axiom/bridge/types";
import { createWssBridge, type WsLike } from "@/lib/axiom/bridge/wss";

function fakeSocket(): WsLike & { sent: string[]; open(): void; drop(): void; reply(payload: unknown): void } {
  const sent: string[] = [];
  const ws = {
    sent,
    onopen: null as (() => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onmessage: null as ((ev: { data: string }) => void) | null,
    send(data: string) {
      sent.push(data);
    },
    close() {
      ws.onclose?.();
    },
    open() {
      ws.onopen?.();
    },
    drop() {
      ws.onclose?.();
    },
    reply(payload: unknown) {
      ws.onmessage?.({ data: JSON.stringify(payload) });
    },
  };
  return ws;
}

const REQ: TruthRequest = { id: 1, method: "axiom.verify", text: "Kapalı sistemde enerji korunur." };

describe("gerçeklik köprüsü", () => {
  it("taşıyıcı seçimi: soket > WebSocket > yok", () => {
    expect(pickTransport({ hasUnix: true, hasWebSocket: true })).toBe("unix");
    expect(pickTransport({ hasUnix: false, hasWebSocket: true })).toBe("wss");
    expect(pickTransport({ hasUnix: false, hasWebSocket: false })).toBe("none");
  });

  it("sabit yollar korunur", () => {
    expect(TRUTH_SOCKET_PATH).toBe("/run/tedbirge/tedbirge_truth.sock");
    expect(TRUTH_WSS_URL).toBe("wss://tedbirge.dev/ws");
  });

  it("geri çekilme üsteldir ve 15 saniyede sınırlanır", () => {
    expect(backoffMs(1)).toBe(500);
    expect(backoffMs(2)).toBe(1000);
    expect(backoffMs(10)).toBe(15_000);
  });

  it("başlangıç durumu bağlantı iddia etmez", () => {
    expect(initialBridgeState("wss").connected).toBe(false);
    expect(initialBridgeState("none").note).toContain("yerel motor");
  });

  it("bağlantı yoksa istek kuyrukta bekler, bağlanınca gönderilir", async () => {
    const ws = fakeSocket();
    const bridge = createWssBridge({
      factory: () => ws,
      schedule: () => undefined,
    });
    const pending = bridge.send(REQ);
    expect(ws.sent).toHaveLength(0);
    expect(bridge.state().pending).toBe(1);

    ws.open();
    expect(bridge.state().connected).toBe(true);
    expect(ws.sent).toHaveLength(1);

    ws.reply({ id: 1, verdict: "200_PROVEN", engine: "mock", simulated: true, ms: 3, cid: "a", seal: "s" });
    const out = await pending;
    expect(out.verdict).toBe("200_PROVEN");
    expect(bridge.state().latencyMs).not.toBeNull();
  });

  it("bağlantı düşerse deneme sayacı artar ve uydurma bağlantı gösterilmez", () => {
    const ws = fakeSocket();
    const bridge = createWssBridge({ factory: () => ws, schedule: () => undefined });
    bridge.connect();
    ws.open();
    ws.drop();
    expect(bridge.state().connected).toBe(false);
    expect(bridge.state().attempts).toBe(1);
    expect(bridge.state().note).toBe("Sunucu bekleniyor");
  });
});
