/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import type { EngineId } from "@/lib/axiom/verify/types";

export type WasmCandidate = { engine: Extract<EngineId, "z3" | "lean4">; url: string };

export type WasmRuntime = {
  engine: Extract<EngineId, "z3" | "lean4">;
  module: WebAssembly.Module;
  bytes: number;
};

export const WASM_CANDIDATES: WasmCandidate[] = [
  { engine: "z3", url: "/axiom/z3.wasm" },
  { engine: "lean4", url: "/axiom/lean.wasm" },
];

export async function loadLocalWasm(candidate: WasmCandidate): Promise<WasmRuntime | null> {
  if (typeof fetch !== "function" || typeof WebAssembly === "undefined") return null;
  const res = await fetch(candidate.url, { method: "GET", cache: "force-cache" });
  if (!res.ok) return null;
  const bytes = Number(res.headers.get("content-length") ?? 0);
  const module = await WebAssembly.compile(await res.arrayBuffer());
  return { engine: candidate.engine, module, bytes };
}