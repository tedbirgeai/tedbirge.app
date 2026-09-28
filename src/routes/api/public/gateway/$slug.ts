/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * ÇİFT YÖNLÜ EVRENSEL AĞ GEÇİDİ — inbound REST köprüsü.
 * POST /api/public/gateway/{slug}
 * - 64 KB gövde sınırı
 * - JSON zorunluluğu
 * - `packet-gate` denetimi (fizik/birim kapısı)
 * - HMAC (opsiyonel) x-tb-signature başlığı
 */

import { createFileRoute } from "@tanstack/react-router";

import { gatePacketClaim } from "@/lib/axiom/net/packet-gate";
import { corsHeaders } from "@/lib/cors";
import { markRestCall, preflightRestBody } from "@/lib/gateway/adapters/rest";
import { getAdapter } from "@/lib/gateway/registry";
import { verifyHmacSha256 } from "@/lib/gateway/adapters/webhook";
import "@/lib/gateway/bootstrap"; // varsayılan adaptör kaydı

function json(body: unknown, status: number, extra: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

export const Route = createFileRoute("/api/public/gateway/$slug")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request, { methods: "POST, GET, OPTIONS" }),
        }),

      GET: async ({ request, params }) => {
        const cors = corsHeaders(request, { methods: "POST, GET, OPTIONS" });
        const adapter = getAdapter(params.slug);
        if (!adapter) return json({ ok: false, error: "adaptor_yok" }, 404, cors);
        const health = adapter.healthCheck ? await adapter.healthCheck() : true;
        return json(
          {
            ok: true,
            slug: adapter.slug,
            protocol: adapter.protocol,
            direction: adapter.direction,
            healthy: health === true,
            reason: health === true ? null : health,
          },
          200,
          cors,
        );
      },

      POST: async ({ request, params }) => {
        const cors = corsHeaders(request, { methods: "POST, GET, OPTIONS" });
        const adapter = getAdapter(params.slug);
        if (!adapter || adapter.direction === "outbound") {
          markRestCall(params.slug, false);
          return json({ ok: false, error: "adaptor_yok" }, 404, cors);
        }
        const raw = await request.text();
        const contentType = request.headers.get("content-type");
        const pre = preflightRestBody(raw, contentType);
        if (!pre.ok) {
          markRestCall(params.slug, false);
          return json({ ok: false, error: pre.reason }, pre.status, cors);
        }

        // Opsiyonel HMAC — env değişkeni varsa zorunlu olur.
        const secretName = `GATEWAY_${params.slug.toUpperCase()}_HMAC`;
        const secret = process.env[secretName];
        if (secret) {
          const signature = request.headers.get("x-tb-signature") ?? "";
          if (!verifyHmacSha256(secret, raw, signature)) {
            markRestCall(params.slug, false);
            return json({ ok: false, error: "imza_gecersiz" }, 401, cors);
          }
        }

        // Değişmez kapısı — fizik/birim/çelişki denetimi.
        const claim = typeof JSON.parse(raw)?.claim === "string" ? JSON.parse(raw).claim : null;
        const decision = gatePacketClaim(claim);
        if (!decision.accepted) {
          markRestCall(params.slug, false);
          return json({ ok: false, error: decision.reason, code: decision.code }, 422, cors);
        }

        markRestCall(params.slug, true);
        return json(
          { ok: true, slug: params.slug, accepted: true, at: Date.now() },
          200,
          cors,
        );
      },
    },
  },
});
