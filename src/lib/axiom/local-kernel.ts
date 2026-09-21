/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * YEDEK ÇEKİRDEK (ana iş parçacığı)
 * ------------------------------------------------------------------
 * Web Worker yasaklı, engellenmiş ya da yüklenemiyorsa arayüz çökmez:
 * aynı çözümleme ve doğrulama zinciri ana iş parçacığında yürütülür.
 * Davranış ve yanıt biçimi daemon ile birebir aynıdır; tek fark
 * hesabın ana iş parçacığında yapılmasıdır (arayüz bunu bildirir).
 */

import { analyze, type KernelAnalysis } from "@/lib/axiom/analyze";
import { AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD } from "@/lib/axiom/brand";
import { AxiomRam, type RamStats } from "@/lib/axiom/ram";
import { verify } from "@/lib/axiom/verify/engine";
import type { VerifyResult } from "@/lib/axiom/verify/types";

const ram = new AxiomRam(AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD);

export function localStats(): RamStats {
  return ram.stats();
}

export function localAnalyze(text: string): { analysis: KernelAnalysis; ram: RamStats } {
  const analysis = analyze(text);
  ram.set(
    `analiz:${analysis.digest.fingerprint}`,
    analysis.digest.bytes * 64 + analysis.metrics.nodes * 256 + 4096,
  );
  return { analysis, ram: ram.stats() };
}

export async function localVerify(
  text: string,
): Promise<{ analysis: KernelAnalysis; result: VerifyResult; ram: RamStats }> {
  const analysis = analyze(text);
  const result = await verify(text, analysis.ir, analysis.matches);
  ram.set(`kanit:${result.cid}`, result.steps.length * 512 + 4096);
  return { analysis, result, ram: ram.stats() };
}
