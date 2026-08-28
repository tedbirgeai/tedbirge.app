import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mesh-envelope", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/mesh-envelope");
  return { ...actual, verifyEnvelope: (env: { h: { sig: string } }) => env.h.sig === "ok" };
});

import { admitEnvelope, guardStats, resetGuard } from "@/lib/mesh/guard";
import type { MeshEnvelopeV2 } from "@/lib/mesh-envelope";

function env(pktId: string, ts: number, sig = "ok"): MeshEnvelopeV2 {
  return { h: { pktId, ts, sig } as MeshEnvelopeV2["h"], b: {} as MeshEnvelopeV2["b"] };
}

describe("zarf doğrulama kasası", () => {
  beforeEach(() => resetGuard());

  it("geçerli paketi kabul eder", () => {
    const now = 1_000_000;
    expect(admitEnvelope(env("a", now), now).ok).toBe(true);
    expect(guardStats().accepted).toBe(1);
  });

  it("aynı paketi ikinci kez almaz", () => {
    const now = 1_000_000;
    admitEnvelope(env("a", now), now);
    const second = admitEnvelope(env("a", now), now);
    expect(second.ok).toBe(false);
    expect(guardStats().duplicate).toBe(1);
  });

  it("tekrar penceresi dışındaki paketi reddeder", () => {
    const now = 1_000_000_000;
    const old = admitEnvelope(env("b", now - 60 * 60_000), now);
    expect(old).toMatchObject({ ok: false, reason: "replay" });
  });

  it("imzasız paketi reddeder", () => {
    const now = 1_000_000;
    expect(admitEnvelope(env("c", now, "kötü"), now)).toMatchObject({
      ok: false,
      reason: "unsigned",
    });
    expect(guardStats().unsigned).toBe(1);
  });

  it("biçimsiz paketi reddeder", () => {
    expect(admitEnvelope(null)).toMatchObject({ ok: false, reason: "malformed" });
  });
});
