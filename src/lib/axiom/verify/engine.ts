/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * DOĞRULAMA MOTORU (Z3 / LEAN 4 / YEREL KURAL KAPISI)
 * ------------------------------------------------------------------
 * Zincir: AXIOM-IR → SMT-LIB 2 + Lean 4 önermesi → motor → karar → mühür.
 * Motor seçimi canlı oturuma aittir; WASM ikilisi yoksa mühür üretmeyen
 * yerel kural kapısı çalışır.
 * Her çağrı 500 ms sert bütçe ve panik koruması altındadır.
 */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import { loadEngine, solveWithEngine } from "@/lib/axiom/live/engine-session";
import { createDeadline, DeadlineExceeded, runGuarded } from "@/lib/axiom/verify/guard";
import { toLean } from "@/lib/axiom/verify/lean";
import { contentId, proofSeal } from "@/lib/axiom/verify/seal";
import { toSmtLib } from "@/lib/axiom/verify/smt";
import {
  VERIFY_TIMEOUT_MS,
  type EngineId,
  type VerifyResult,
  type VerifyVerdict,
} from "@/lib/axiom/verify/types";

/** Çıktı kartında gösterilecek önerme uzunluğu sınırı. */
const SNIPPET = 2000;

function sonuc(
  text: string,
  engine: EngineId,
  wasmVerified: boolean,
  verdict: VerifyVerdict,
  steps: VerifyResult["steps"],
  ms: number,
  smt: string,
  lean: string,
): VerifyResult {
  const cid = contentId(text, engine, verdict);
  return {
    engine,
    wasmVerified,
    simulated: !wasmVerified,
    verdict,
    steps,
    ms,
    cid,
    seal: wasmVerified ? proofSeal(cid, verdict) : null,
    smt: smt.slice(0, SNIPPET),
    lean: lean.slice(0, SNIPPET),
  };
}

/**
 * Doğrulamayı yürütür. Zaman aşımı ve panik durumlarında adım listesi
 * boştur ve mühür üretilmez: hiçbir ara veri dışa taşınmaz.
 */
export async function verify(
  text: string,
  ir: AxiomIr,
  matches: InvariantMatch[],
  budgetMs: number = VERIFY_TIMEOUT_MS,
): Promise<VerifyResult> {
  const handle = await loadEngine().catch(() => ({
    engine: "local" as EngineId,
    module: null,
    wasmLoaded: false,
  }));

  const smt = toSmtLib(ir, matches);
  const lean = toLean(ir, matches);

  const outcome = await runGuarded(async (deadline: ReturnType<typeof createDeadline>) => {
    const solved = await solveWithEngine(handle, ir, matches);
    if (deadline.expired()) throw new DeadlineExceeded();
    return solved;
  }, budgetMs);

  if (!outcome.ok) {
    return sonuc(text, handle.engine, handle.wasmLoaded, outcome.verdict, [], outcome.ms, smt, lean);
  }
  return sonuc(
    text,
    handle.engine,
    handle.wasmLoaded,
    outcome.value.verdict,
    outcome.value.steps,
    outcome.ms,
    smt,
    lean,
  );
}
