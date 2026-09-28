import { describe, expect, it } from "vitest";
import { decodeProof, encodeProof, TB_PROOF_OFFSETS, TB_PROOF_SIZE, verifyProofLayout } from "@/lib/axiom/bridge/cabi-layout";

describe("tb_proof_t düzeni", () => {
  it("212 bayt ve C başlığı ofsetleri", () => {
    expect(TB_PROOF_SIZE).toBe(212);
    expect(TB_PROOF_OFFSETS).toEqual({ verdict: 0, engine: 4, wasmVerified: 8, ms: 12, cid: 16, seal: 81, pad: 210 });
    expect(verifyProofLayout()).toBe(true);
  });
  it("gidiş-dönüş", () => {
    const p = { verdict: 409, engine: 0, wasmVerified: false, ms: 12, cid: "c".repeat(64), seal: "" };
    expect(decodeProof(encodeProof(p))).toEqual(p);
  });
  it("bozuk uzunluk ve taşma reddedilir", () => {
    expect(() => decodeProof(new Uint8Array(211))).toThrow();
    expect(() => encodeProof({ verdict: 0, engine: 0, wasmVerified: false, ms: 0, cid: "x".repeat(65), seal: "" })).toThrow();
  });
});
