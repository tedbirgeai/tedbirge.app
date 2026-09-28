/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * WEBHOOK ADAPTÖRÜ — HMAC doğrulaması + basit retry outbox iskeleti.
 */

import { createHmac, timingSafeEqual } from "crypto";

import { recordCall, registerAdapter } from "@/lib/gateway/registry";

export function registerWebhookReceiver(slug: string, label: string): void {
  registerAdapter({
    slug,
    protocol: "webhook",
    direction: "inbound",
    label,
    strictHmac: true,
  });
}


export function verifyHmacSha256(secret: string, body: string, signatureHex: string): boolean {
  if (!signatureHex) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signatureHex, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function markWebhookCall(slug: string, ok: boolean): void {
  recordCall(slug, ok);
}
