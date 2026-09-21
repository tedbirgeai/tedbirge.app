/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { describe, expect, it } from "vitest";

import {
  anthropicTool,
  openAiTool,
  toJsonRpc,
  toolCatalogue,
  toToolResult,
} from "@/lib/axiom/net/llm-adapters";
import { handleMcpRequest, JSONRPC_ERRORS, MCP_MAX_BODY } from "@/lib/axiom/net/mcp-server";

describe("JSON-RPC 2.0 sunucusu", () => {
  it("yetenek şemasını döner", async () => {
    const res = await handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "axiom.capabilities" });
    expect("result" in res).toBe(true);
    if ("result" in res) {
      const r = res.result as { methods: unknown[]; timeoutMs: number };
      expect(r.methods).toHaveLength(3);
      expect(r.timeoutMs).toBe(500);
    }
  });

  it("doğrulama kararı ve mühür alanı döner", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: "a",
      method: "axiom.verify",
      params: { text: "Kapalı sistemde enerji korunur." },
    });
    expect("result" in res).toBe(true);
    if ("result" in res) {
      const r = res.result as { verdict: string; seal: string | null };
      expect(r.verdict).toBe("200_PROVEN");
      expect(r.seal).toContain("TEDBİRGE-WEBOS-ZKP");
    }
  });

  it("çözümleme metodu dil ve ölçüm döner", async () => {
    const res = await handleMcpRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "axiom.analyze",
      params: { text: "fn main() { let mut x = 1; }" },
    });
    if ("result" in res) {
      const r = res.result as { lang: { kind: string }; metrics: { nodes: number } };
      expect(r.lang.kind).toBe("code");
      expect(r.metrics.nodes).toBeGreaterThan(0);
    } else {
      throw new Error("sonuç beklenmişti");
    }
  });

  it("geçersiz istek, bilinmeyen metot ve eksik parametreyi ayırt eder", async () => {
    const bad = await handleMcpRequest({ method: "axiom.verify" });
    expect("error" in bad && bad.error.code).toBe(JSONRPC_ERRORS.invalidRequest);

    const unknown = await handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "axiom.sihir" });
    expect("error" in unknown && unknown.error.code).toBe(JSONRPC_ERRORS.methodNotFound);

    const missing = await handleMcpRequest({ jsonrpc: "2.0", id: 4, method: "axiom.verify" });
    expect("error" in missing && missing.error.code).toBe(JSONRPC_ERRORS.invalidParams);
  });

  it("gövde sınırı 64 KB'dir", () => {
    expect(MCP_MAX_BODY).toBe(65536);
  });
});

describe("LLM adaptörleri", () => {
  it("araç şemaları aynı parametreleri paylaşır", () => {
    expect(openAiTool().function.name).toBe("axiom_verify");
    expect(anthropicTool().input_schema).toEqual(openAiTool().function.parameters);
    expect(toolCatalogue().mcp).toBe("/api/public/v1/mcp/verify");
  });

  it("araç çağrısını JSON-RPC isteğine çevirir", () => {
    expect(toJsonRpc({ text: "deneme" })).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "axiom.verify",
      params: { text: "deneme" },
    });
  });

  it("yanıtı araç sonucuna çevirir", () => {
    const text = toToolResult({
      jsonrpc: "2.0",
      id: 1,
      result: { verdict: "200_PROVEN", engine: "mock", seal: "TEDBİRGE-WEBOS-ZKP:abc" },
    });
    expect(text).toContain("STATUS: 200_PROVEN");
    expect(
      toToolResult({ jsonrpc: "2.0", id: 1, error: { code: -32601, message: "yok" } }),
    ).toContain("-32601");
  });
});
