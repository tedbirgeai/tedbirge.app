/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * ÇİFT YÖNLÜ EVRENSEL AĞ GEÇİDİ — KAYIT DEFTERİ
 * ------------------------------------------------------------------
 * Tüm dış protokol köprüleri (REST, GraphQL, WS/SSE, Webhook, gRPC, SOAP,
 * MQTT, AMQP) bu tek kaynak üzerinden kayıt olur. Her adaptör; yönü
 * (inbound/outbound), protokol adını, çağrı örneğini ve isteğe bağlı
 * sağlık kontrolünü açıklar. Kayıt zamanı ve son 24 saatteki hata oranı
 * `metrics()` üzerinden diagnostics kartına akar.
 */

export type GatewayDirection = "inbound" | "outbound" | "bidirectional";

export type GatewayProtocol =
  | "rest"
  | "graphql"
  | "ws"
  | "sse"
  | "webhook"
  | "grpc"
  | "soap"
  | "mqtt"
  | "amqp"
  | "mcp";

export type GatewayAdapter = {
  slug: string;
  protocol: GatewayProtocol;
  direction: GatewayDirection;
  label: string;
  /** İsteğe bağlı sağlık kontrolü: true → sağlıklı, string → hata gerekçesi. */
  healthCheck?: () => Promise<true | string>;
  /** Adaptörü açar/başlatır; idempotent olmalı. */
  activate?: () => Promise<void> | void;
  /** true ise inbound köprü imza zorunlu kılar; env sırrı yoksa istek reddedilir. */
  strictHmac?: boolean;
};

type MetricsEntry = { ok: number; err: number; at: number };

const adapters = new Map<string, GatewayAdapter>();
const metrics = new Map<string, MetricsEntry[]>();

const METRIC_WINDOW_MS = 24 * 60 * 60 * 1000;

function prune(entries: MetricsEntry[], now: number) {
  const cutoff = now - METRIC_WINDOW_MS;
  while (entries.length && entries[0]!.at < cutoff) entries.shift();
}

export function registerAdapter(adapter: GatewayAdapter): void {
  adapters.set(adapter.slug, adapter);
  if (!metrics.has(adapter.slug)) metrics.set(adapter.slug, []);
  void adapter.activate?.();
}

export function listAdapters(): GatewayAdapter[] {
  return Array.from(adapters.values());
}

export function getAdapter(slug: string): GatewayAdapter | undefined {
  return adapters.get(slug);
}

export function recordCall(slug: string, ok: boolean): void {
  const now = Date.now();
  const entries = metrics.get(slug) ?? [];
  entries.push({ ok: ok ? 1 : 0, err: ok ? 0 : 1, at: now });
  prune(entries, now);
  metrics.set(slug, entries);
}

export type GatewayMetrics = {
  slug: string;
  protocol: GatewayProtocol;
  direction: GatewayDirection;
  label: string;
  ok24h: number;
  err24h: number;
  errorRate: number;
  strictHmac: boolean;
};

export function collectMetrics(): GatewayMetrics[] {
  const now = Date.now();
  return listAdapters().map((a) => {
    const entries = metrics.get(a.slug) ?? [];
    prune(entries, now);
    const ok = entries.reduce((s, e) => s + e.ok, 0);
    const err = entries.reduce((s, e) => s + e.err, 0);
    const total = ok + err;
    return {
      slug: a.slug,
      protocol: a.protocol,
      direction: a.direction,
      label: a.label,
      ok24h: ok,
      err24h: err,
      errorRate: total === 0 ? 0 : err / total,
      strictHmac: a.strictHmac === true,
    };
  });
}

/** Test yardımcısı: sadece test dosyalarında çağrılmalı. */
export function __resetGatewayRegistry(): void {
  adapters.clear();
  metrics.clear();
}
