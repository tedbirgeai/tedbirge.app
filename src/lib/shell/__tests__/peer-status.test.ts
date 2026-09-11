import { describe, expect, it } from "vitest";

import { samePeerStatus, type PeerStatus } from "@/lib/shell/peer-status";

const base: PeerStatus = { text: "Bağlı", tone: "linked", peers: 2, queued: 0, rttMs: 40 };

describe("eş durumu eşitlik kontrolü", () => {
  it("aynı değerler için yeni yayın yapılmasını engeller", () => {
    expect(samePeerStatus(base, { ...base })).toBe(true);
  });

  it("cihaz sayısı değişince farkı görür", () => {
    expect(samePeerStatus(base, { ...base, peers: 3 })).toBe(false);
  });

  it("gecikme değişince farkı görür", () => {
    expect(samePeerStatus(base, { ...base, rttMs: null })).toBe(false);
  });
});
