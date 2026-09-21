/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM ÇEKİRDEK DAEMON'I (Web Worker)
 * ------------------------------------------------------------------
 * Ana iş parçacığı yalnız çizim yapar; bayt ayrıştırma ve sanal RAM
 * defteri bu daemon'da tutulur. Faz 1'de doğrulama motoru yoktur:
 * daemon girdinin bayt görünümünü üretir ve önbellek durumunu bildirir.
 */

import { AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD } from "@/lib/axiom/brand";
import { byteDigest, type ByteDigest } from "@/lib/axiom/digest";
import { AxiomRam, type RamStats } from "@/lib/axiom/ram";

export type KernelRequest =
  | { id: number; type: "boot" }
  | { id: number; type: "digest"; text: string }
  | { id: number; type: "stat" };

export type KernelResponse =
  | { id: number; type: "boot"; ram: RamStats; engine: "mock" }
  | { id: number; type: "digest"; digest: ByteDigest; ram: RamStats }
  | { id: number; type: "stat"; ram: RamStats };

const ram = new AxiomRam(AXIOM_RAM_LIMIT, AXIOM_RAM_THRESHOLD);

self.onmessage = (event: MessageEvent<KernelRequest>) => {
  const msg = event.data;
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
  const out: KernelResponse = { id: msg.id, type: "stat", ram: ram.stats() };
  self.postMessage(out);
};
