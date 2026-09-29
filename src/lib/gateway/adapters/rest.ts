/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * REST ADAPTÖRÜ (inbound) — Ağ Geçidi
 * ------------------------------------------------------------------
 * Dış REST çağrılarını Ağ Geçidi üzerinden Tedbirge iç aracına (tool) çevirir.
 * OpenAPI şeması opsiyonel: verildiğinde araç isimleri ondan üretilir,
 * verilmediğinde slug + method kullanılır. Gövde her zaman `packet-gate`
 * denetiminden geçer; reddedilirse çağrı 422 döner.
 */

import { registerAdapter, recordCall } from "@/lib/gateway/registry";

export type RestInboundConfig = {
  slug: string;
  label: string;
  /** HMAC anahtarı env adı; verilmezse imzasız kabul edilir. */
  hmacEnv?: string;
  /** Zorunlu Content-Type; varsayılan `application/json`. */
  contentType?: string;
  /** true → imza zorunlu; sırr yoksa istek reddedilir. */
  strictHmac?: boolean;
};

export function registerRestInbound(config: RestInboundConfig): void {
  registerAdapter({
    slug: config.slug,
    protocol: "rest",
    direction: "inbound",
    label: config.label,
    strictHmac: config.strictHmac === true,
    async healthCheck() {
      return true;
    },
  });
}

export function markRestCall(slug: string, ok: boolean): void {
  recordCall(slug, ok);
}

/** Gövde boyutu, MIME ve şema öncesi hızlı kabul denetimleri. */
export function preflightRestBody(
  raw: string,
  contentType: string | null,
  maxBytes = 64 * 1024,
): { ok: true } | { ok: false; status: number; reason: string } {
  if (raw.length > maxBytes) {
    return { ok: false, status: 413, reason: "Gövde 64 KB sınırını aşıyor" };
  }
  if (contentType && !contentType.toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, reason: "Yalnız application/json kabul edilir" };
  }
  try {
    JSON.parse(raw || "null");
  } catch {
    return { ok: false, status: 400, reason: "Gövde geçerli JSON değil" };
  }
  return { ok: true };
}
