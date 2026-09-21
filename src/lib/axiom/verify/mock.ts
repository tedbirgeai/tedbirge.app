/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * MOCK MOTOR (WASM İKİLİSİ YOKKEN)
 * ------------------------------------------------------------------
 * Z3 / Lean 4 ikilileri depoda bulunmadığında doğrulama zinciri kesilmez:
 * determinist bir karar üreten simülasyon motoru çalışır. Aynı girdi her
 * zaman aynı adımları ve aynı kararı verir; arayüz bunun simülasyon
 * olduğunu açıkça yazar.
 */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import type { ProofStep, VerifyVerdict } from "@/lib/axiom/verify/types";

export function mockSolve(
  ir: AxiomIr,
  matches: InvariantMatch[],
): { verdict: VerifyVerdict; steps: ProofStep[] } {
  const steps: ProofStep[] = [];
  const push = (rule: string, detail: string) =>
    steps.push({ index: steps.length + 1, rule, detail });

  push(
    "parse",
    `ara gösterim okundu: ${ir.concepts.length} kavram, ${ir.quantities.length} nicelik`,
  );
  push("declare", "nicelikler gerçel değişkenlere bağlandı");

  const conflicts = matches.filter((m) => m.verdict === "celiski");
  const related = matches.filter((m) => m.verdict === "ilgili");

  for (const m of conflicts) push("assert-not", `${m.invariant.id}: değişmez ihlali varsayıldı`);
  for (const m of related) push("assert", `${m.invariant.id}: alan varsayımı eklendi`);

  let verdict: VerifyVerdict;
  if (conflicts.length) {
    push("check-sat", "unsat — iddia eşleşen değişmezle çelişiyor");
    verdict = "409_REFUTED";
  } else if (related.length) {
    push("check-sat", "sat — model bulundu, değişmezlerle uyumlu");
    push("seal", "karar mühürlenmeye uygun");
    verdict = "200_PROVEN";
  } else {
    push("check-sat", "unknown — eşleşen değişmez yok, hüküm verilemez");
    verdict = "422_UNDECIDED";
  }
  return { verdict, steps };
}
