/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { afterEach, describe, expect, it } from "vitest";

import { matchInvariants } from "@/lib/axiom/invariants";
import { askAscii } from "@/lib/axiom/lang/ask-ascii";
import { toIr } from "@/lib/axiom/lang/axiom-ir";
import { evaluateLocalRules } from "@/lib/axiom/live/fallback-verifier";
import { resetEngineSession } from "@/lib/axiom/live/engine-session";
import { verify } from "@/lib/axiom/verify/engine";
import { runGuarded } from "@/lib/axiom/verify/guard";
import { toLean } from "@/lib/axiom/verify/lean";
import { contentId, proofSeal, SEAL_PREFIX } from "@/lib/axiom/verify/seal";
import { toSmtLib } from "@/lib/axiom/verify/smt";
import { SAFE_RESULT_KEYS, VERIFY_TIMEOUT_MS } from "@/lib/axiom/verify/types";

function chain(text: string) {
  const { tokens } = askAscii(text);
  const ir = toIr(tokens);
  return { ir, matches: matchInvariants(ir, text) };
}

const UYUMLU = "Kapalı sistemde enerji korunur.";
const CELISKILI = "Bu makine yoktan enerji üretir ve verimi %100 olur.";
const originalFetch = globalThis.fetch;

afterEach(() => {
  resetEngineSession();
  globalThis.fetch = originalFetch;
});

describe("SMT-LIB üretimi", () => {
  it("nicelikleri ve kontrol komutlarını içerir", () => {
    const { ir, matches } = chain("Sistem 500 joule enerji üretir.");
    const smt = toSmtLib(ir, matches);
    expect(smt).toContain("(set-logic QF_NRA)");
    expect(smt).toContain("(check-sat)");
    expect(smt).toContain("declare-const");
  });

  it("çelişkili iddiada ihlal varsayımı yazar", () => {
    const { ir, matches } = chain(CELISKILI);
    expect(toSmtLib(ir, matches)).toContain("değişmezi ihlal ediyor");
  });
});

describe("Lean 4 önerme üretimi", () => {
  it("teorem ve namespace üretir", () => {
    const { ir, matches } = chain(UYUMLU);
    const lean = toLean(ir, matches);
    expect(lean).toContain("theorem axiom_claim");
    expect(lean).toContain("namespace Axiom");
  });
});

describe("yerel kural kapısı determinizmi", () => {
  it("aynı girdide aynı kararı ve adımları verir", () => {
    const a = chain(UYUMLU);
    const b = chain(UYUMLU);
    expect(evaluateLocalRules(a.ir, a.matches, false)).toEqual(
      evaluateLocalRules(b.ir, b.matches, false),
    );
  });

  it("çelişkide çürütme, eşleşme yokken hüküm yok", () => {
    const c = chain(CELISKILI);
    expect(evaluateLocalRules(c.ir, c.matches, false).verdict).toBe("409_REFUTED");
    const n = chain("qqq zzz");
    expect(evaluateLocalRules(n.ir, n.matches, false).verdict).toBe("422_UNDECIDED");
  });
});

describe("zaman aşımı ve panik koruması", () => {
  it("bütçe aşılırsa EXECUTION_TIMEOUT döner", async () => {
    const out = await runGuarded(() => new Promise((r) => setTimeout(() => r(1), 80)), 10);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.verdict).toBe("504_EXECUTION_TIMEOUT");
  });

  it("özel durumda PANIC döner ve içerik taşınmaz", async () => {
    const out = await runGuarded(() => {
      throw new Error("gizli-girdi-metni");
    });
    expect(out.ok).toBe(false);
    expect(JSON.stringify(out)).not.toContain("gizli-girdi-metni");
    if (!out.ok) expect(out.verdict).toBe("500_PANIC");
  });

  it("sert bütçe 500 ms'dir", () => {
    expect(VERIFY_TIMEOUT_MS).toBe(500);
  });
});

describe("CID ve mühür", () => {
  it("CID determinist, mühür yalnız kanıtta", () => {
    expect(contentId("abc", "local", "200_PROVEN")).toBe(
      contentId("abc", "local", "200_PROVEN"),
    );
    expect(contentId("abc", "local", "200_PROVEN")).not.toBe(
      contentId("abd", "local", "200_PROVEN"),
    );
    expect(proofSeal("cid:axiom:0123456789abcdef", "200_PROVEN")).toContain(SEAL_PREFIX);
    expect(proofSeal("cid:axiom:0123456789abcdef", "409_REFUTED")).toBeNull();
  });
});

describe("uçtan uca doğrulama", () => {
  it("WASM yokken uyumlu iddia mühürsüz ve kararsız kalır", async () => {
    resetEngineSession();
    const { ir, matches } = chain(UYUMLU);
    const r = await verify(UYUMLU, ir, matches);
    expect(r.engine).toBe("local");
    expect(r.wasmVerified).toBe(false);
    expect(r.verdict).toBe("422_UNDECIDED");
    expect(r.seal).toBeNull();
    expect(r.steps.length).toBeGreaterThan(2);
    expect(r.ms).toBeLessThanOrEqual(VERIFY_TIMEOUT_MS);
  });

  it("çelişkili iddia çürütülür ve mühürlenmez", async () => {
    resetEngineSession();
    const { ir, matches } = chain(CELISKILI);
    const r = await verify(CELISKILI, ir, matches);
    expect(r.verdict).toBe("409_REFUTED");
    expect(r.seal).toBeNull();
  });

  it("yerel WASM paketi varsa karar mühürlenir", async () => {
    resetEngineSession();
    const wasm = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    globalThis.fetch = async () =>
      new Response(wasm, {
        status: 200,
        headers: { "content-length": String(wasm.byteLength) },
      });
    const { ir, matches } = chain(UYUMLU);
    const r = await verify(UYUMLU, ir, matches);
    expect(r.engine).toBe("z3");
    expect(r.wasmVerified).toBe(true);
    expect(r.verdict).toBe("200_PROVEN");
    expect(r.seal).toContain(SEAL_PREFIX);
  });

  it("zaman aşımında adım listesi boş kalır (sızıntı yok)", async () => {
    resetEngineSession();
    const { ir, matches } = chain(UYUMLU);
    const r = await verify(UYUMLU, ir, matches, 0);
    expect(r.verdict).toBe("504_EXECUTION_TIMEOUT");
    expect(r.steps).toEqual([]);
    expect(SAFE_RESULT_KEYS.every((k) => k in r)).toBe(true);
  });
});
