/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * VARSAYILAN ADAPTÖR KAYITLARI — Ağ Geçidi ilk açılışta bunlarla gelir.
 * Yeni adaptörler ayrı dosyalarda `registerAdapter(...)` çağrısıyla eklenir.
 */

import { registerRestInbound } from "@/lib/gateway/adapters/rest";
import { registerWebhookReceiver } from "@/lib/gateway/adapters/webhook";
import { registerAdapter } from "@/lib/gateway/registry";

let booted = false;

export function bootstrapGateway(): void {
  if (booted) return;
  booted = true;

  // Standart REST köprüsü — genel amaçlı iddia doğrulaması.
  registerRestInbound({ slug: "verify", label: "AXIOM Verify REST köprüsü" });

  // Webhook alıcı — HMAC ile.
  registerWebhookReceiver("webhook", "Genel Webhook alıcı");

  // Placeholder adaptörler — Faz 3'te üretim seviyesine çıkarılacak.
  for (const stub of [
    { slug: "graphql", protocol: "graphql" as const, label: "GraphQL köprüsü (stub)" },
    { slug: "ws", protocol: "ws" as const, label: "WS köprüsü (stub)" },
    { slug: "sse", protocol: "sse" as const, label: "SSE köprüsü (stub)" },
    { slug: "grpc", protocol: "grpc" as const, label: "gRPC köprüsü (stub)" },
    { slug: "soap", protocol: "soap" as const, label: "SOAP köprüsü (stub)" },
    { slug: "mqtt", protocol: "mqtt" as const, label: "MQTT köprüsü (stub)" },
    { slug: "amqp", protocol: "amqp" as const, label: "AMQP köprüsü (stub)" },
  ]) {
    registerAdapter({
      slug: stub.slug,
      protocol: stub.protocol,
      direction: "bidirectional",
      label: stub.label,
      healthCheck: async () => "yol_haritası_faz_3",
    });
  }
}

bootstrapGateway();
