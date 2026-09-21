/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import { beforeEach, describe, expect, it } from "vitest";

import {
  meterRecord,
  meterResetForTest,
  meterSnapshot,
  clientDigest,
} from "@/lib/axiom/billing/meter";
import { amountUsd, formatUsd, TARIFF, tierForEngine } from "@/lib/axiom/billing/tariff";
import { reviewProof } from "@/lib/axiom/net/arbiters";
import { rewardsFrom } from "@/lib/axiom/net/rewards";
import { contentId, proofSeal } from "@/lib/axiom/verify/seal";
import type { VerifyResult } from "@/lib/axiom/verify/types";

function sonuc(text: string, proven: boolean, seal?: string | null): VerifyResult {
  const verdict = proven ? "200_PROVEN" : "409_REFUTED";
  const cid = contentId(text, "mock", verdict);
  return {
    verdict,
    engine: "mock",
    simulated: true,
    cid,
    seal: seal === undefined ? proofSeal(cid, verdict) : seal,
    ms: 12,
    steps: [],
    smt: "",
    lean: "",
  } as VerifyResult;
}

describe("tarife", () => {
  it("motorları doğru katmana eşler", () => {
    expect(tierForEngine("z3")).toBe("z3");
    expect(tierForEngine("mock")).toBe("z3");
    expect(tierForEngine("lean4")).toBe("lean4");
    expect(tierForEngine("z3", true)).toBe("omni");
  });

  it("emirdeki birim ücretleri taşır", () => {
    expect(TARIFF.z3.unitUsd).toBe(0.001);
    expect(TARIFF.lean4.unitUsd).toBe(0.01);
    expect(TARIFF.omni.unitUsd).toBe(0.05);
    expect(amountUsd("lean4", 3)).toBeCloseTo(0.03, 6);
    expect(formatUsd(0.001)).toBe("$0.0010");
  });
});

describe("ölçüm defteri", () => {
  beforeEach(() => meterResetForTest());

  it("çağrıları ve tutarları biriktirir", () => {
    meterRecord({ engine: "mock", simulated: true, verdict: "200_PROVEN", ms: 10 });
    meterRecord({ engine: "lean4", simulated: false, verdict: "409_REFUTED", ms: 30 });
    const snap = meterSnapshot();
    expect(snap.calls).toBe(2);
    expect(snap.amount).toBeCloseTo(0.011, 6);
    expect(snap.simulatedCalls).toBe(1);
    expect(snap.hourly).toHaveLength(24);
  });

  it("müşteri anahtarını ham tutmaz", () => {
    const rec = meterRecord({
      engine: "mock",
      simulated: true,
      verdict: "200_PROVEN",
      ms: 5,
      client: "gizli-anahtar",
    });
    expect(rec.client).not.toContain("gizli");
    expect(rec.client).toBe(clientDigest("gizli-anahtar"));
    expect(JSON.stringify(rec)).not.toContain("gizli-anahtar");
  });
});

describe("hakem düğümler", () => {
  it("tutarlı mührü 3/3 kabul eder", () => {
    const v = reviewProof(sonuc("Kapalı sistemde enerji korunur.", true));
    expect(v.accepted).toBe(3);
    expect(v.quorum).toBe(true);
    expect(v.spoofed).toBe(false);
  });

  it("sahte mührü reddeder", () => {
    const v = reviewProof(
      sonuc("Kapalı sistemde enerji korunur.", true, "TEDBİRGE-WEBOS-ZKP:0000"),
    );
    expect(v.quorum).toBe(false);
    expect(v.spoofed).toBe(true);
  });

  it("mühürsüz kararda mühür beklemez", () => {
    const v = reviewProof(sonuc("Yoktan enerji üretir.", false));
    expect(v.quorum).toBe(true);
    expect(v.spoofed).toBe(false);
  });
});

describe("ağ kredisi", () => {
  beforeEach(() => meterResetForTest());

  it("katman ağırlığına göre kredi verir", () => {
    meterRecord({ engine: "mock", simulated: true, verdict: "200_PROVEN", ms: 4 });
    meterRecord({ engine: "lean4", simulated: false, verdict: "200_PROVEN", ms: 9 });
    const r = rewardsFrom(meterSnapshot(), 2);
    expect(r.credits).toBe(1 + 8);
    expect(r.quorumPassed).toBe(2);
    expect(r.simulated).toBe(true);
  });
});
