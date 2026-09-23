/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import { executeVerification, type VerificationTier } from "../core/kernel.worker";

export interface MCPJsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: "axiom.verify_proof" | "axiom.get_invariants";
  params: {
    claim_text: string;
    verification_tier?: VerificationTier;
    api_key?: string;
  };
}

export interface MCPJsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: {
    status: "200_PROVEN" | "UNPROVABLE" | "EXECUTION_TIMEOUT" | "PANIC_RECOVERED";
    proof_hash: string;
    latency_ms: number;
    cost_credited_usd: number;
    counter_example: string | null;
    verification_seal: string;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Model Context Protocol (MCP) JSON-RPC 2.0 Gateway Handler
 * Endpoint: POST /api/v1/mcp/verify
 */
export async function handleMCPRequest(req: MCPJsonRpcRequest): Promise<MCPJsonRpcResponse> {
  if (req.jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32600, message: "Invalid Request: jsonrpc version must be '2.0'" },
    };
  }

  if (req.method !== "axiom.verify_proof") {
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32601, message: `Method not found: ${req.method}` },
    };
  }

  const tier = req.params.verification_tier || "Z3_SMT";
  const claim = req.params.claim_text || "";

  if (!claim) {
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: { code: -32602, message: "Invalid params: claim_text is required" },
    };
  }

  const result = await executeVerification({
    id: String(req.id || Date.now()),
    claimText: claim,
    tier,
  });

  return {
    jsonrpc: "2.0",
    id: req.id,
    result: {
      status: result.status,
      proof_hash: result.proofHash,
      latency_ms: result.latencyMs,
      cost_credited_usd: result.costCreditedUsd,
      counter_example: result.counterExample,
      verification_seal: "TEDBİRGE-WEBOS-ZKP-ROOT-CA-VERIFIED",
    },
  };
}
