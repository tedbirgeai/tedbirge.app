/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import { evaluateLocalRules, type LocalRuleDecision } from "@/lib/axiom/live/fallback-verifier";
import { proveWithLean } from "@/lib/axiom/live/lean-adapter";
import { loadLocalWasm, WASM_CANDIDATES, type WasmRuntime } from "@/lib/axiom/live/wasm-runtime";
import { solveWithZ3 } from "@/lib/axiom/live/z3-adapter";
import type { EngineId } from "@/lib/axiom/verify/types";

export type EngineHandle = {
  engine: EngineId;
  module: WasmRuntime | null;
  wasmLoaded: boolean;
};

const LOCAL_HANDLE: EngineHandle = { engine: "local", module: null, wasmLoaded: false };

let cached: EngineHandle | null = null;
let pending: Promise<EngineHandle> | null = null;

async function probe(): Promise<EngineHandle> {
  for (const candidate of WASM_CANDIDATES) {
    try {
      const runtime = await loadLocalWasm(candidate);
      if (runtime) return { engine: runtime.engine, module: runtime, wasmLoaded: true };
    } catch {
      // Sıfır günlük: yükleme ayrıntısı kaydedilmez, sıradaki yerel adaya geçilir.
    }
  }
  return LOCAL_HANDLE;
}

export function loadEngine(): Promise<EngineHandle> {
  if (cached) return Promise.resolve(cached);
  pending ??= probe().then((handle) => {
    cached = handle;
    pending = null;
    return handle;
  });
  return pending;
}

export function resetEngineSession(): void {
  cached = null;
  pending = null;
}

export async function solveWithEngine(
  handle: EngineHandle,
  ir: AxiomIr,
  matches: InvariantMatch[],
): Promise<LocalRuleDecision> {
  if (handle.module?.engine === "z3") return solveWithZ3(handle.module, ir, matches);
  if (handle.module?.engine === "lean4") return proveWithLean(handle.module, ir, matches);
  return evaluateLocalRules(ir, matches, false);
}