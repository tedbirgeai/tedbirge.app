/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/** Kanıt görüntüleyici kartının beklediği görünüm modeli. */
export interface VerificationResult {
  id: string;
  status: "200_PROVEN" | "UNPROVABLE" | "EXECUTION_TIMEOUT" | "PANIC_RECOVERED";
  proofHash: string;
  latencyMs: number;
  costCreditedUsd: number;
  steps: string[];
  counterExample: string | null;
  timestamp: string;
}
