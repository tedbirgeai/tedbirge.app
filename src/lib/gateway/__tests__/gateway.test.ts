import { beforeEach, describe, expect, it } from "vitest";

import { preflightRestBody } from "@/lib/gateway/adapters/rest";
import { verifyHmacSha256 } from "@/lib/gateway/adapters/webhook";
import {
  __resetGatewayRegistry,
  collectMetrics,
  getAdapter,
  recordCall,
  registerAdapter,
} from "@/lib/gateway/registry";

describe("gateway registry", () => {
  beforeEach(() => __resetGatewayRegistry());

  it("adaptörü kaydeder ve alır", () => {
    registerAdapter({ slug: "t", protocol: "rest", direction: "inbound", label: "Test" });
    expect(getAdapter("t")?.label).toBe("Test");
  });

  it("başarı/başarısızlık sayaçlarını tutar", () => {
    registerAdapter({ slug: "m", protocol: "rest", direction: "inbound", label: "M" });
    recordCall("m", true);
    recordCall("m", false);
    const [row] = collectMetrics();
    expect(row?.ok24h).toBe(1);
    expect(row?.err24h).toBe(1);
    expect(row?.errorRate).toBeCloseTo(0.5);
  });
});

describe("preflightRestBody", () => {
  it("64 KB üstü gövdeyi reddeder", () => {
    const big = "x".repeat(64 * 1024 + 1);
    const r = preflightRestBody(big, "application/json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(413);
  });

  it("JSON dışı Content-Type'ı reddeder", () => {
    const r = preflightRestBody("{}", "text/plain");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(415);
  });

  it("geçersiz JSON'u reddeder", () => {
    const r = preflightRestBody("{bad", "application/json");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("geçerli JSON'u kabul eder", () => {
    expect(preflightRestBody('{"a":1}', "application/json").ok).toBe(true);
  });
});

describe("verifyHmacSha256", () => {
  it("doğru imzayı kabul eder", () => {
    // sha256("hello", key="s") = precomputed
    const sig = "44f11d5c8578a30ff5e83a4e6d67b3a2bffe97a1b96c1e6f6bc9c3ffea1f7b3d";
    // hesaplamayı çalıştıralım (sabit yerine dinamik doğrulama)
    const { createHmac } = require("crypto");
    const expected = createHmac("sha256", "s").update("hello").digest("hex");
    expect(verifyHmacSha256("s", "hello", expected)).toBe(true);
    expect(verifyHmacSha256("s", "hello", sig)).toBe(false);
  });
});
