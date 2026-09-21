/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * EVRENSEL SDK ADAPTÖR ŞABLONLARI
 * ------------------------------------------------------------------
 * Yedi hedef için MCP uç noktasına JSON-RPC 2.0 çağrısı yapan kaynak
 * şablonları üretir. Şablonlar kopyalanabilir metindir: burada hiçbir
 * derleyici eklentisi kurulmaz, hiçbir paket yayımlanmaz.
 */

export type SdkTarget = "node" | "python" | "rust" | "java" | "go" | "csharp" | "hdl";

export const SDK_TARGETS: { id: SdkTarget; label: string; file: string }[] = [
  { id: "node", label: "Node.js / TypeScript", file: "axiom-client.ts" },
  { id: "python", label: "Python", file: "axiom_client.py" },
  { id: "rust", label: "Rust", file: "axiom_client.rs" },
  { id: "java", label: "Java", file: "AxiomClient.java" },
  { id: "go", label: "Go", file: "axiom_client.go" },
  { id: "csharp", label: "C#", file: "AxiomClient.cs" },
  { id: "hdl", label: "HDL (Verilog/VHDL denetimi)", file: "axiom_hdl_check.sh" },
];

/** MCP yolu tek doğruluk kaynağından okunur. */
export const SDK_MCP_PATH = "/api/public/v1/mcp/verify";

const BODY = `{"jsonrpc":"2.0","id":1,"method":"axiom.verify","params":{"text":"<önerme>"}}`;

export function adapterSource(target: SdkTarget, baseUrl: string): string {
  const url = `${baseUrl}${SDK_MCP_PATH}`;
  switch (target) {
    case "node":
      return `// AXIOM istemcisi — Node.js 18+ (yerleşik fetch)
export async function axiomVerify(text: string) {
  const res = await fetch("${url}", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "axiom.verify", params: { text } }),
  });
  const payload = await res.json();
  if (payload.error) throw new Error(payload.error.message);
  return payload.result; // { verdict, cid, seal, ms, engine, simulated }
}`;
    case "python":
      return `# AXIOM istemcisi — Python 3.9+
import json, urllib.request

def axiom_verify(text: str) -> dict:
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "axiom.verify",
                       "params": {"text": text}}).encode()
    req = urllib.request.Request("${url}", data=body,
                                 headers={"Content-Type": "application/json"})
    payload = json.loads(urllib.request.urlopen(req).read())
    if "error" in payload:
        raise RuntimeError(payload["error"]["message"])
    return payload["result"]`;
    case "rust":
      return `// AXIOM istemcisi — Rust (reqwest + serde_json)
use serde_json::{json, Value};

pub async fn axiom_verify(text: &str) -> Result<Value, Box<dyn std::error::Error>> {
    let body = json!({"jsonrpc": "2.0", "id": 1, "method": "axiom.verify",
                      "params": {"text": text}});
    let payload: Value = reqwest::Client::new()
        .post("${url}")
        .json(&body)
        .send()
        .await?
        .json()
        .await?;
    if let Some(err) = payload.get("error") {
        return Err(err["message"].as_str().unwrap_or("axiom error").into());
    }
    Ok(payload["result"].clone())
}`;
    case "java":
      return `// AXIOM istemcisi — Java 11+ (java.net.http)
import java.net.URI;
import java.net.http.*;

public final class AxiomClient {
  public static String verify(String text) throws Exception {
    String body = "{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1,\\"method\\":\\"axiom.verify\\","
        + "\\"params\\":{\\"text\\":" + quote(text) + "}}";
    HttpRequest request = HttpRequest.newBuilder(URI.create("${url}"))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();
    return HttpClient.newHttpClient()
        .send(request, HttpResponse.BodyHandlers.ofString())
        .body();
  }

  private static String quote(String value) {
    return "\\"" + value.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
  }
}`;
    case "go":
      return `// AXIOM istemcisi — Go 1.21+
package axiom

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
)

func Verify(text string) (map[string]any, error) {
	body, _ := json.Marshal(map[string]any{
		"jsonrpc": "2.0", "id": 1, "method": "axiom.verify",
		"params": map[string]string{"text": text},
	})
	res, err := http.Post("${url}", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var payload struct {
		Result map[string]any \`json:"result"\`
		Error  *struct{ Message string } \`json:"error"\`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, err
	}
	if payload.Error != nil {
		return nil, errors.New(payload.Error.Message)
	}
	return payload.Result, nil
}`;
    case "csharp":
      return `// AXIOM istemcisi — C# / .NET 8
using System.Net.Http.Json;

public static class AxiomClient
{
    private static readonly HttpClient Http = new();

    public static async Task<JsonElement> VerifyAsync(string text)
    {
        var body = new { jsonrpc = "2.0", id = 1, method = "axiom.verify",
                         @params = new { text } };
        var response = await Http.PostAsJsonAsync("${url}", body);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (payload.TryGetProperty("error", out var error))
            throw new InvalidOperationException(error.GetProperty("message").GetString());
        return payload.GetProperty("result");
    }
}`;
    case "hdl":
      return `#!/usr/bin/env bash
# AXIOM HDL denetimi — Verilog/VHDL kaynağını değişmez kurallara karşı doğrular
set -euo pipefail
dosya="\${1:?kullanim: axiom_hdl_check.sh <kaynak.v>}"
metin="$(sed 's/"/\\\\"/g' "$dosya" | tr '\\n' ' ')"
curl -sS -X POST "${url}" \\
  -H 'Content-Type: application/json' \\
  -d "{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1,\\"method\\":\\"axiom.verify\\",\\"params\\":{\\"text\\":\\"\${metin}\\"}}"`;
    default:
      return BODY;
  }
}
