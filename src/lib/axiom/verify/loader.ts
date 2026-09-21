/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * WASM MOTOR YÜKLEYİCİ (Z3 / LEAN 4)
 * ------------------------------------------------------------------
 * Geriye dönük içe aktarımlar canlı motor oturumuna yönlendirilir.
 */

export {
  loadEngine,
  resetEngineSession as resetEngineCache,
} from "@/lib/axiom/live/engine-session";
export type { EngineHandle } from "@/lib/axiom/live/engine-session";
