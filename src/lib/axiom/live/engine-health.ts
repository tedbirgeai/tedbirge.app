/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import type { EngineId } from "@/lib/axiom/verify/types";

export const AXIOM_ACTIVE_STATUS = "Faz 1 — Çekirdek Doğrulama Motoru Aktif (Çevrimiçi)";
export const AXIOM_ACTIVE_BADGE = "AXIOM Kernel v12 — Active";

export type EngineHealth = {
  engine: EngineId;
  active: boolean;
  wasmLoaded: boolean;
  label: string;
  note: string;
};

export function engineLabel(engine: EngineId): string {
  if (engine === "z3") return "Z3 SMT";
  if (engine === "lean4") return "Lean 4";
  return "Yerel kural kapısı";
}

export function healthForEngine(engine: EngineId, wasmLoaded: boolean): EngineHealth {
  return {
    engine,
    active: true,
    wasmLoaded,
    label: engineLabel(engine),
    note: wasmLoaded
      ? "Canlı ikili doğrulama bağlı"
      : "Yerel kural kapısı aktif; mühür için Z3/Lean ikilisi bekleniyor",
  };
}
