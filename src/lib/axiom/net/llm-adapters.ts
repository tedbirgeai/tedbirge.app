/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * LLM İSTEMCİ ADAPTÖRLERİ
 * ------------------------------------------------------------------
 * AXIOM MCP uç noktası tek bir JSON-RPC yüzeyi sunar. Bu dosya, yaygın
 * LLM araç çağrısı biçimlerini (OpenAI tool-call, Anthropic tool) o
 * yüzeye ve geri çevirir. Ağ çağrısı yapmaz, yalnız biçim dönüştürür.
 */

import { mcpCapabilities, type JsonRpcResponse } from "@/lib/axiom/net/mcp-server";

export const MCP_PATH = "/api/public/v1/mcp/verify";

/** OpenAI sohbet tamamlama araç tanımı. */
export function openAiTool() {
  return {
    type: "function" as const,
    function: {
      name: "axiom_verify",
      description:
        "Tedbirge AXIOM çekirdeğinde bir iddiayı ya da kod parçasını doğrular; karar kodu ve mühür döner.",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "Doğrulanacak önerme ya da kod" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
  };
}

/** Anthropic araç tanımı. */
export function anthropicTool() {
  return {
    name: "axiom_verify",
    description: openAiTool().function.description,
    input_schema: openAiTool().function.parameters,
  };
}

/** Araç çağrısı argümanlarını JSON-RPC isteğine çevirir. */
export function toJsonRpc(
  args: unknown,
  method: "axiom.verify" | "axiom.analyze" = "axiom.verify",
  id: string | number = 1,
) {
  const text = typeof args === "string" ? args : ((args as { text?: unknown })?.text ?? "");
  return { jsonrpc: "2.0" as const, id, method, params: { text: String(text) } };
}

/** JSON-RPC yanıtını araç sonucu metnine çevirir (LLM'e geri beslenir). */
export function toToolResult(response: JsonRpcResponse): string {
  if ("error" in response) return `AXIOM hata ${response.error.code}: ${response.error.message}`;
  const r = response.result as { verdict?: string; seal?: string | null; engine?: string };
  if (!r?.verdict) return JSON.stringify(response.result);
  return [
    `STATUS: ${r.verdict}`,
    `ENGINE: ${r.engine ?? "local"}`,
    r.seal ? `SEAL: ${r.seal}` : "SEAL: yok",
  ].join("\n");
}

/** Keşif uçları için araç listesi (capabilities ile aynı kaynaktan). */
export function toolCatalogue() {
  return { mcp: MCP_PATH, capabilities: mcpCapabilities(), tools: [openAiTool(), anthropicTool()] };
}
