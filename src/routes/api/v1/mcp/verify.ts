/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS. */

/**
 * AXIOM MCP ALIAS — POST /api/v1/mcp/verify
 * ------------------------------------------------------------------
 * Kamusal MCP doğrulama uç noktasının kısa yoludur. Aynı JSON-RPC 2.0
 * işleyicisini kullanır; 64 KB gövde sınırı ve 500 ms doğrulama bütçesi
 * korunur.
 */

import { createFileRoute } from "@tanstack/react-router";

import { toolCatalogue } from "@/lib/axiom/net/llm-adapters";
import { handleMcpRequest, JSONRPC_ERRORS, MCP_MAX_BODY } from "@/lib/axiom/net/mcp-server";
import { corsHeaders } from "@/lib/cors";

function json(body: unknown, status: number, extra: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

export const Route = createFileRoute("/api/v1/mcp/verify")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, {
          status: 204,
          headers: corsHeaders(request, { methods: "POST, GET, OPTIONS" }),
        }),

      GET: async ({ request }) =>
        json(toolCatalogue(), 200, corsHeaders(request, { methods: "POST, GET, OPTIONS" })),

      POST: async ({ request }) => {
        const cors = corsHeaders(request, { methods: "POST, GET, OPTIONS" });
        const raw = await request.text();
        if (raw.length > MCP_MAX_BODY) {
          return json(
            {
              jsonrpc: "2.0",
              id: null,
              error: {
                code: JSONRPC_ERRORS.invalidRequest,
                message: "Gövde 64 KB sınırını aşıyor",
              },
            },
            413,
            cors,
          );
        }
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json(
            {
              jsonrpc: "2.0",
              id: null,
              error: { code: JSONRPC_ERRORS.parse, message: "Gövde geçerli JSON değil" },
            },
            400,
            cors,
          );
        }
        const client =
          request.headers.get("x-axiom-client") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          null;
        const response = await handleMcpRequest(body, client);
        return json(response, "error" in response ? 400 : 200, cors);
      },
    },
  },
});
