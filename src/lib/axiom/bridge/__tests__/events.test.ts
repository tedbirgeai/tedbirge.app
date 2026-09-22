import { beforeEach, describe, expect, it } from "vitest";

import {
  clearBridgeEvents,
  EVENT_LOG_LIMIT,
  getBridgeEvents,
  handleEventFrame,
  kindForCode,
  noteFor,
  parseEventFrame,
  recordBridgeEvent,
  subscribeBridgeEvents,
} from "@/lib/axiom/bridge/events";

describe("olay akışı", () => {
  beforeEach(() => clearBridgeEvents());

  it("sistem sinyallerini sade Türkçe olaylara eşler", () => {
    expect(kindForCode("SIGSEGV")).toBe("memory-fault");
    expect(kindForCode("ENOMEM")).toBe("out-of-memory");
    expect(kindForCode("thermal")).toBe("hardware");
    expect(kindForCode("bilinmeyen")).toBeNull();
    expect(noteFor("out-of-memory")).toContain("Bellek doldu");
  });

  it("istek numarası taşıyan çerçeveyi olay saymaz", () => {
    expect(parseEventFrame({ id: 4, verdict: "200_PROVEN" })).toBeNull();
  });

  it("numarasız çerçeveyi olay akışına yazar", () => {
    const event = handleEventFrame({ event: "signal", code: "SIGSEGV" });
    expect(event?.kind).toBe("memory-fault");
    expect(event?.severity).toBe("error");
    expect(getBridgeEvents()[0]).toBe(event);
  });

  it("tanınmayan çerçeveyi sessizce düşürür", () => {
    expect(handleEventFrame({ event: "merhaba" })).toBeNull();
    expect(handleEventFrame("bozuk")).toBeNull();
    expect(getBridgeEvents()).toHaveLength(0);
  });

  it("halka arabelleği son elli olayla sınırlıdır", () => {
    for (let i = 0; i < EVENT_LOG_LIMIT + 12; i += 1) recordBridgeEvent("retry");
    expect(getBridgeEvents()).toHaveLength(EVENT_LOG_LIMIT);
  });

  it("aynı anlık görüntüyü döner ve dinleyiciyi uyarır", () => {
    let calls = 0;
    const off = subscribeBridgeEvents(() => {
      calls += 1;
    });
    const before = getBridgeEvents();
    expect(getBridgeEvents()).toBe(before);
    recordBridgeEvent("connected");
    expect(calls).toBe(1);
    expect(getBridgeEvents()).not.toBe(before);
    off();
  });

  it("olay kaydı girdi metni taşımaz", () => {
    const event = recordBridgeEvent("memory-fault", "SIGSEGV");
    expect(Object.keys(event).sort()).toEqual(["at", "code", "kind", "note", "severity"]);
  });
});
