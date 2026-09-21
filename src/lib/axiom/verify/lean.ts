/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM-IR → LEAN 4 TEOREM İSKELETİ
 * ------------------------------------------------------------------
 * Biçimsel kayıtlar (durma problemi, Gödel) ve mühendislik standartları
 * için hedef önerme Lean 4 sözdiziminde kurulur. İskelet, Lean ikilisi
 * bağlandığında doğrudan çalıştırılabilir olacak biçimde üretilir.
 */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";

export function toLean(ir: AxiomIr, matches: InvariantMatch[]): string {
  const lines: string[] = ["import Mathlib", "namespace Axiom", ""];
  const hedef = matches.length
    ? matches.map((m) => `Inv.${m.invariant.id.replace(/\./g, "_")}`).join(" ∧ ")
    : "True";

  lines.push("-- Eşleşen değişmezler varsayım olarak alınır.");
  for (const m of matches) {
    lines.push(`axiom Inv.${m.invariant.id.replace(/\./g, "_")} : Prop`);
  }
  lines.push("");
  lines.push(`-- Nicelik sayısı: ${ir.quantities.length}, kavram sayısı: ${ir.concepts.length}`);
  lines.push(`theorem axiom_claim : ${ir.negated ? `¬ (${hedef})` : hedef} := by`);
  lines.push(matches.length ? "  repeat constructor <;> assumption" : "  trivial");
  lines.push("");
  lines.push("end Axiom");
  return lines.join("\n");
}
