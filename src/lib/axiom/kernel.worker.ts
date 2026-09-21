/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM ÇEKİRDEK DAEMON'I (Web Worker)
 * ------------------------------------------------------------------
 * Ana iş parçacığı yalnız çizim yapar; bayt ayrıştırma, dil tanıma,
 * yapı ağacı üretimi, ara gösterim ve değişmez eşleştirme bu daemon'da
 * yürür. `verify` isteği 500 ms sert bütçe altında karar döner. Yerel
 * Z3/Lean ikilisi varsa mühür üretilir, yoksa mühürsüz yerel kural kapısı çalışır.
 */

import { analyze, type KernelAnalysis } from "@/lib/axiom/analyze";
import { AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD } from "@/lib/axiom/brand";
import { byteDigest, type ByteDigest } from "@/lib/axiom/digest";
import { loadEngine } from "@/lib/axiom/live/engine-session";
import { AxiomRam, type RamStats } from "@/lib/axiom/ram";
import { verify } from "@/lib/axiom/verify/engine";
import type { EngineId, VerifyResult } from "@/lib/axiom/verify/types";

export type { KernelAnalysis };
export { analyze };

export type KernelRequest =
  | { id: number; type: "boot" }
  | { id: number; type: "digest"; text: string }
  | { id: number; type: "analyze"; text: string }
  | { id: number; type: "verify"; text: string }
  | { id: number; type: "stat" };

export type KernelResponse =
  | { id: number; type: "boot"; ram: RamStats; engine: EngineId }
  | { id: number; type: "digest"; digest: ByteDigest; ram: RamStats }
  | { id: number; type: "analyze"; analysis: KernelAnalysis; ram: RamStats }
  | {
      id: number;
      type: "verify";
      analysis: KernelAnalysis;
      result: VerifyResult;
      ram: RamStats;
    }
  | { id: number; type: "stat"; ram: RamStats }
  | { id: number; type: "error"; message: string; ram: RamStats };

const ram = new AxiomRam(AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD);

self.onmessage = async (event: MessageEvent<KernelRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "boot") {
      const handle = await loadEngine();
      const out: KernelResponse = { id: msg.id, type: "boot", ram: ram.stats(), engine: handle.engine };
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
    if (msg.type === "verify") {
      const analysis = analyze(msg.text);
      // Doğrulama 500 ms sert bütçe ve panik koruması altında yürür.
      const result = await verify(msg.text, analysis.ir, analysis.matches);
      ram.set(`kanit:${result.cid}`, result.steps.length * 512 + 4096);
      const out: KernelResponse = {
        id: msg.id,
        type: "verify",
        analysis,
        result,
        ram: ram.stats(),
      };
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
