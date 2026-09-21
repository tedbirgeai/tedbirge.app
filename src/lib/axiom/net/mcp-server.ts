/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * EVRENSEL MCP SUNUCUSU (JSON-RPC 2.0)
 * ------------------------------------------------------------------
 * Dış istemciler (LLM araçları, SDK'lar) AXIOM çekirdeğini tek bir
 * JSON-RPC yüzeyi üzerinden çağırır. Metotlar:
 *
 *   axiom.capabilities → araç şeması ve motor durumu
 *   axiom.analyze      → dil tanıma, yapı ağacı, değişmez eşleşmeleri
 *   axiom.verify       → doğrulama kararı + mühür
 *
 * Girdi metni yanıt gövdesine kopyalanmaz, hiçbir yere kaydedilmez.
 */

import { z } from "zod";

import { meterRecord } from "@/lib/axiom/billing/meter";
import { matchInvariants } from "@/lib/axiom/invariants";
import { askAscii, astMetrics } from "@/lib/axiom/lang/ask-ascii";
import { toIr } from "@/lib/axiom/lang/axiom-ir";
import { detectLanguage } from "@/lib/axiom/lang/detect";
import { loadEngine } from "@/lib/axiom/live/engine-session";
import { verify } from "@/lib/axiom/verify/engine";
import { SEAL_PREFIX } from "@/lib/axiom/verify/seal";
import { VERIFY_TIMEOUT_MS } from "@/lib/axiom/verify/types";

/** Gövde üst sınırı: 64 KB. */
export const MCP_MAX_BODY = 64 * 1024;

export const JSONRPC_ERRORS = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32000,
} as const;

const RequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  method: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

const TextParams = z.object({ text: z.string().min(1).max(MCP_MAX_BODY) });
const ToolCallParams = z.object({
  name: z.enum(["axiom.verify", "axiom.analyze", "axiom.capabilities"]),
  arguments: z
    .object({
      text: z.string().min(1).max(MCP_MAX_BODY).optional(),
      source: z.string().min(1).max(MCP_MAX_BODY).optional(),
      engine: z.string().optional(),
    })
    .optional(),
});

export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | {
      jsonrpc: "2.0";
      id: string | number | null;
      error: { code: number; message: string; data?: unknown };
    };

function ok(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function err(id: string | number | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Dış istemcilere sunulan araç şeması. */
export async function mcpCapabilities() {
  const handle = await loadEngine().catch(() => null);
  const proofsAreSealed = Boolean(handle?.wasmLoaded);
  return {
    server: "tedbirge-axiom",
    protocol: "jsonrpc-2.0",
    seal: SEAL_PREFIX,
    timeoutMs: VERIFY_TIMEOUT_MS,
    proofsAreSealed,
    engine: handle?.engine ?? "local",
    methods: [
      {
        name: "axiom.verify",
        description:
          "Bir iddiayı ya da kod parçasını değişmez kayıtlarıyla doğrular; karar ve mühür döner.",
        params: { text: "string" },
      },
      {
        name: "axiom.analyze",
        description: "Dil tanıma, yapı ağacı ölçümleri ve değişmez eşleşmelerini döner.",
        params: { text: "string" },
      },
      { name: "axiom.capabilities", description: "Bu şemayı döner.", params: {} },
    ],
  };
}

async function handleAxiomMethod(
  id: string | number | null,
  method: "axiom.analyze" | "axiom.verify",
  params: unknown,
  client?: string | null,
): Promise<JsonRpcResponse> {
  const p = TextParams.safeParse(params ?? {});
  if (!p.success) return err(id, JSONRPC_ERRORS.invalidParams, "`text` alanı zorunludur");
  const text = p.data.text;
  try {
    const lang = detectLanguage(text);
    const { tokens, ast } = askAscii(text);
    const ir = toIr(tokens);
    const matches = matchInvariants(ir, text);
    if (method === "axiom.analyze") return ok(id, { lang, metrics: astMetrics(ast), matches });
    const result = await verify(text, ir, matches);
    // Ölçüm defteri: yalnız katman, gecikme, karar ve müşteri özeti.
    meterRecord({
      engine: result.engine,
      simulated: result.simulated,
      verdict: result.verdict,
      ms: result.ms,
      client: client ?? null,
    });
    return ok(id, { ...result, lang, matches });
  } catch {
    // Sıfır günlük: hata içeriği dışa verilmez.
    return err(id, JSONRPC_ERRORS.internal, "Doğrulama tamamlanamadı");
  }
}

/**
 * Tek JSON-RPC isteğini işler. Gövde daha önce ayrıştırılmış olmalıdır.
 * `client` verilirse ölçüm defterine yalnız özeti yazılır.
 */
export async function handleMcpRequest(
  body: unknown,
  client?: string | null,
): Promise<JsonRpcResponse> {
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(null, JSONRPC_ERRORS.invalidRequest, "Geçersiz JSON-RPC 2.0 isteği");
  }
  const { method, params } = parsed.data;
  const id = parsed.data.id ?? null;

  if (method === "axiom.capabilities" || method === "tools/list") return ok(id, await mcpCapabilities());

  if (method === "tools/call") {
    const p = ToolCallParams.safeParse(params ?? {});
    if (!p.success) return err(id, JSONRPC_ERRORS.invalidParams, "Geçersiz araç çağrısı");
    if (p.data.name === "axiom.capabilities") return ok(id, await mcpCapabilities());
    const text = p.data.arguments?.text ?? p.data.arguments?.source;
    return handleAxiomMethod(id, p.data.name, { text }, client);
  }

  if (method === "axiom.analyze" || method === "axiom.verify") {
    return handleAxiomMethod(id, method, params, client);
  }

  return err(id, JSONRPC_ERRORS.methodNotFound, `Bilinmeyen metot: ${method}`);
}
