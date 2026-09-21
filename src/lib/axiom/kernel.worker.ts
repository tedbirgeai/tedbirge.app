/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM ÇEKİRDEK DAEMON'I (Web Worker)
 * ------------------------------------------------------------------
 * Ana iş parçacığı yalnız çizim yapar; bayt ayrıştırma, dil tanıma,
 * yapı ağacı üretimi, ara gösterim ve değişmez eşleştirme bu daemon'da
 * yürür. Faz 2'de simgesel doğrulama motoru (Z3 / Lean 4) hâlâ bağlı
 * DEĞİLDİR: daemon kanıt üretmez, yalnız yapı ve değişmez eşleşmesi
 * bildirir.
 */

import { AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD } from "@/lib/axiom/brand";
import { byteDigest, type ByteDigest } from "@/lib/axiom/digest";
import { matchInvariants, type InvariantMatch } from "@/lib/axiom/invariants";
import { askAscii, astMetrics, type AstNode } from "@/lib/axiom/lang/ask-ascii";
import { toIr, type AxiomIr } from "@/lib/axiom/lang/axiom-ir";
import { detectLanguage, type LangGuess } from "@/lib/axiom/lang/detect";
import { AxiomRam, type RamStats } from "@/lib/axiom/ram";

export type KernelAnalysis = {
  digest: ByteDigest;
  lang: LangGuess;
  ast: AstNode;
  metrics: { nodes: number; depth: number };
  ir: AxiomIr;
  matches: InvariantMatch[];
};

export type KernelRequest =
  | { id: number; type: "boot" }
  | { id: number; type: "digest"; text: string }
  | { id: number; type: "analyze"; text: string }
  | { id: number; type: "stat" };

export type KernelResponse =
  | { id: number; type: "boot"; ram: RamStats; engine: "mock" }
  | { id: number; type: "digest"; digest: ByteDigest; ram: RamStats }
  | { id: number; type: "analyze"; analysis: KernelAnalysis; ram: RamStats }
  | { id: number; type: "stat"; ram: RamStats }
  | { id: number; type: "error"; message: string; ram: RamStats };

const ram = new AxiomRam(AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD);

/** Tam çözümleme zinciri: bayt → belirteç → ağaç → IR → değişmez. */
export function analyze(text: string): KernelAnalysis {
  const digest = byteDigest(text);
  const lang = detectLanguage(text);
  const { tokens, ast } = askAscii(text);
  const ir = toIr(tokens);
  const matches = matchInvariants(ir, text);
  return { digest, lang, ast, metrics: astMetrics(ast), ir, matches };
}

self.onmessage = (event: MessageEvent<KernelRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "boot") {
      const out: KernelResponse = { id: msg.id, type: "boot", ram: ram.stats(), engine: "mock" };
      self.postMessage(out);
      return;
    }
    if (msg.type === "digest") {
      const digest = byteDigest(msg.text);
      // Ayrıştırma sonucu önbelleğe alınır; eşik aşılırsa LRU tahliyesi çalışır.
      ram.set(`digest:${digest.fingerprint}`, digest.bytes * 64 + 4096);
      const out: KernelResponse = { id: msg.id, type: "digest", digest, ram: ram.stats() };
      self.postMessage(out);
      return;
    }
    if (msg.type === "analyze") {
      const analysis = analyze(msg.text);
      ram.set(
        `analiz:${analysis.digest.fingerprint}`,
        analysis.digest.bytes * 64 + analysis.metrics.nodes * 256 + 4096,
      );
      const out: KernelResponse = { id: msg.id, type: "analyze", analysis, ram: ram.stats() };
      self.postMessage(out);
      return;
    }
    const out: KernelResponse = { id: msg.id, type: "stat", ram: ram.stats() };
    self.postMessage(out);
  } catch (err) {
    // Daemon asla sessizce ölmez: hata arayüze taşınır.
    const out: KernelResponse = {
      id: msg.id,
      type: "error",
      message: err instanceof Error ? err.message : "Bilinmeyen çekirdek hatası",
      ram: ram.stats(),
    };
    self.postMessage(out);
  }
};
