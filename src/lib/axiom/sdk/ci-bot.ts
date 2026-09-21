/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * CI/CD DENETİM BOTU (axiom-proof-action)
 * ------------------------------------------------------------------
 * İş akışı metnini üretir ve bir PR denetimini yerelde benzetir:
 * dosya listesi → karar özeti → PR yorumu taslağı. Gerçek bir GitHub
 * uygulaması kurulmaz, dış çağrı yapılmaz.
 */

import { SDK_MCP_PATH } from "@/lib/axiom/sdk/adapters";
import type { VerifyVerdict } from "@/lib/axiom/verify/types";

export const CI_ACTION_NAME = "axiom-proof-action";

export function workflowYaml(baseUrl: string): string {
  return `name: AXIOM kanıt denetimi
on: [pull_request]

jobs:
  ${CI_ACTION_NAME}:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Değişen dosyaları doğrula
        env:
          AXIOM_MCP: ${baseUrl}${SDK_MCP_PATH}
        run: |
          set -euo pipefail
          git diff --name-only origin/\${{ github.base_ref }}... > degisen.txt
          while read -r dosya; do
            [ -f "$dosya" ] || continue
            metin="$(head -c 60000 "$dosya" | python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))')"
            karar="$(curl -sS -X POST "$AXIOM_MCP" -H 'Content-Type: application/json' \\
              -d "{\\"jsonrpc\\":\\"2.0\\",\\"id\\":1,\\"method\\":\\"axiom.verify\\",\\"params\\":{\\"text\\":$metin}}")"
            echo "$dosya → $karar"
            echo "$karar" | grep -q '409_REFUTED' && exit 1
          done < degisen.txt
`;
}

export type CiFileReport = {
  path: string;
  verdict: VerifyVerdict;
  ms: number;
};

export type CiRunReport = {
  action: string;
  files: CiFileReport[];
  proven: number;
  refuted: number;
  undecided: number;
  /** Denetim geçti mi (409 yoksa geçer)? */
  passed: boolean;
  comment: string;
  simulated: true;
};

/** PR denetimini benzetir: karar listesi verilir, özet ve yorum üretilir. */
export function simulateCiRun(files: CiFileReport[]): CiRunReport {
  const proven = files.filter((f) => f.verdict === "200_PROVEN").length;
  const refuted = files.filter((f) => f.verdict === "409_REFUTED").length;
  const undecided = files.length - proven - refuted;
  const passed = refuted === 0;
  const lines = files.map((f) => `- \`${f.path}\` → **${f.verdict}** (${f.ms} ms)`);
  const comment = [
    `### ${CI_ACTION_NAME} — ${passed ? "denetim geçti" : "denetim başarısız"}`,
    "",
    ...lines,
    "",
    `Özet: ${proven} kanıtlandı · ${refuted} çürütüldü · ${undecided} kararsız`,
    "",
    "_Bu rapor benzetimdir; gerçek Z3/Lean 4 ikilisi bağlandığında karar motordan gelir._",
  ].join("\n");
  return { action: CI_ACTION_NAME, files, proven, refuted, undecided, passed, comment, simulated: true };
}
