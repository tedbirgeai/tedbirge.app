/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * ÇÖZÜMLEME ZİNCİRİ (iş parçacığından bağımsız)
 * ------------------------------------------------------------------
 * Aynı zincir hem çekirdek daemon'ında hem de daemon başlatılamadığında
 * ana iş parçacığındaki yedek motorda çalışır. Bu yüzden burada hiçbir
 * `self` / Worker bağımlılığı yoktur.
 */

import type { ByteDigest } from "@/lib/axiom/digest";
import { byteDigest } from "@/lib/axiom/digest";
import { matchInvariants, type InvariantMatch } from "@/lib/axiom/invariants";
import { askAscii, astMetrics, type AstNode } from "@/lib/axiom/lang/ask-ascii";
import { toIr, type AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import { detectLanguage, type LangGuess } from "@/lib/axiom/lang/detect";

export type KernelAnalysis = {
  digest: ByteDigest;
  lang: LangGuess;
  ast: AstNode;
  metrics: { nodes: number; depth: number };
  ir: AxiomIr;
  matches: InvariantMatch[];
};

/** Tam çözümleme zinciri: bayt → belirteç → ağaç → IR → değişmez. */
export function analyze(text: string): KernelAnalysis {
  const digest = byteDigest(text);
  const lang = detectLanguage(text);
  const { tokens, ast } = askAscii(text);
  const ir = toIr(tokens);
  const matches = matchInvariants(ir, text);
  return { digest, lang, ast, metrics: astMetrics(ast), ir, matches };
}
