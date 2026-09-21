/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * WASM MOTOR YÜKLEYİCİ (Z3 / LEAN 4)
 * ------------------------------------------------------------------
 * İkililer yalnız yerelden yüklenir: `/axiom/z3.wasm` ve `/axiom/lean.wasm`.
 * CDN ya da uzak kaynak KULLANILMAZ. İkili yoksa motor "mock" olur.
 * Sonuç tek sefer önbelleklenir; her doğrulamada ağ yoklaması yapılmaz.
 */

import type { EngineId } from "@/lib/axiom/verify/types";

export type EngineHandle = {
  engine: EngineId;
  simulated: boolean;
  /** Yüklenen modül; mock motorda null. */
  module: WebAssembly.Module | null;
};

const MOCK: EngineHandle = { engine: "mock", simulated: true, module: null };

const PATHS: Array<{ engine: EngineId; url: string }> = [
  { engine: "z3", url: "/axiom/z3.wasm" },
  { engine: "lean4", url: "/axiom/lean.wasm" },
];

let cached: EngineHandle | null = null;
let pending: Promise<EngineHandle> | null = null;

async function probe(): Promise<EngineHandle> {
  // Sunucu tarafında (MCP uç noktası) göreli yol çözülemez: doğrudan mock.
  if (typeof fetch !== "function" || typeof WebAssembly === "undefined") return MOCK;
  for (const candidate of PATHS) {
    try {
      const res = await fetch(candidate.url, { method: "GET", cache: "force-cache" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !type.includes("wasm")) continue;
      const module = await WebAssembly.compileStreaming(res);
      return { engine: candidate.engine, simulated: false, module };
    } catch {
      // İkili yok ya da derlenemedi: sıradaki adaya geç, en sonunda mock.
    }
  }
  return MOCK;
}

export async function loadEngine(): Promise<EngineHandle> {
  if (cached) return cached;
  pending ??= probe().then((handle) => {
    cached = handle;
    pending = null;
    return handle;
  });
  return pending;
}

/** Testler için önbelleği sıfırlar. */
export function resetEngineCache(): void {
  cached = null;
  pending = null;
}
