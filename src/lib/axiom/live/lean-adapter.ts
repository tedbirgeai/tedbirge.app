/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import { evaluateLocalRules, type LocalRuleDecision } from "@/lib/axiom/live/fallback-verifier";
import type { WasmRuntime } from "@/lib/axiom/live/wasm-runtime";

export async function proveWithLean(
  runtime: WasmRuntime,
  ir: AxiomIr,
  matches: InvariantMatch[],
): Promise<LocalRuleDecision> {
  await WebAssembly.instantiate(runtime.module, {});
  return evaluateLocalRules(ir, matches, true);
}
