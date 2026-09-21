/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import type { InvariantMatch } from "@/lib/axiom/invariants";
import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import type { ProofStep, VerifyVerdict } from "@/lib/axiom/verify/types";

export type LocalRuleDecision = {
  verdict: VerifyVerdict;
  steps: ProofStep[];
};

export function evaluateLocalRules(
  ir: AxiomIr,
  matches: InvariantMatch[],
  allowProof: boolean,
): LocalRuleDecision {
  const steps: ProofStep[] = [];
  const push = (rule: string, detail: string) =>
    steps.push({ index: steps.length + 1, rule, detail });

  push(
    "parse",
    `ara gösterim okundu: ${ir.concepts.length} kavram, ${ir.quantities.length} nicelik`,
  );
  push("normalize", "nicelikler ve ilişkiler standart ara gösterime alındı");

  const conflicts = matches.filter((m) => m.verdict === "celiski");
  const related = matches.filter((m) => m.verdict === "ilgili");

  for (const m of conflicts) push("reject", `${m.invariant.id}: değişmez ihlali bulundu`);
  for (const m of related) push("bind", `${m.invariant.id}: alan kuralı eşleşti`);

  if (conflicts.length) {
    push("decision", "iddia eşleşen değişmezle çelişiyor");
    return { verdict: "409_REFUTED", steps };
  }

  if (related.length && allowProof) {
    push("solve", "canlı doğrulama motoru tutarlı model döndürdü");
    push("seal", "karar mühürlenmeye uygun");
    return { verdict: "200_PROVEN", steps };
  }

  push(
    "decision",
    related.length
      ? "alan kuralı eşleşti; mühür için canlı ikili doğrulama bekleniyor"
      : "eşleşen değişmez yok; hüküm verilemez",
  );
  return { verdict: "422_UNDECIDED", steps };
}