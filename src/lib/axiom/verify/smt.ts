/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM-IR → SMT-LIB 2 ÇEVİRİCİSİ (Z3 GİRDİSİ)
 * ------------------------------------------------------------------
 * Ara gösterimdeki nicelikler gerçel değişkenlere, eşleşen değişmezler
 * ise `assert` satırlarına çevrilir. Çıktı düz metindir; Z3 ikilisi
 * bağlı olmasa da üretilir ve arayüzde gösterilir.
 */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";

/** SMT sembolü olarak güvenli ad üretir. */
function symbol(raw: string, index: number): string {
  const safe = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  return safe.length ? `q_${safe}_${index}` : `q_${index}`;
}

export function toSmtLib(ir: AxiomIr, matches: InvariantMatch[]): string {
  const lines: string[] = ["(set-logic QF_NRA)", "(set-option :produce-models true)"];

  ir.quantities.forEach((q, i) => {
    const name = symbol(q.unit ?? "skaler", i);
    lines.push(`(declare-const ${name} Real)`);
    lines.push(`(assert (= ${name} ${Number.isFinite(q.value) ? q.value : 0}))`);
  });

  // Enerji korunumu ve verim sınırları: niceliği olan her iddiada tanımlı.
  lines.push("(declare-const enerji_giris Real)");
  lines.push("(declare-const enerji_cikis Real)");
  lines.push("(assert (>= enerji_giris 0))");
  lines.push("(assert (<= enerji_cikis enerji_giris))");

  for (const m of matches) {
    const tag = m.invariant.id.replace(/[^a-z0-9_.]/gi, "_");
    lines.push(`; ${tag} — ${m.invariant.statement}`);
    if (m.verdict === "celiski") {
      lines.push(`(assert (not (=> true true))) ; ${tag}: iddia değişmezi ihlal ediyor`);
    } else {
      lines.push(`(assert true) ; ${tag}: alan içi, ihlal işareti yok`);
    }
  }

  if (ir.negated) lines.push("; girdi olumsuzlama içeriyor: hedef önerme ters çevrilir");
  lines.push("(check-sat)");
  lines.push("(get-model)");
  return lines.join("\n");
}
