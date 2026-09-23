/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

import React from "react";
import type { VerificationResult } from "../../core/kernel.worker";

interface ProofViewerProps {
  result?: VerificationResult | null;
}

export const ProofViewer: React.FC<ProofViewerProps> = ({ result }) => {
  if (!result) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 font-mono text-xs text-zinc-500">
        Henüz bir doğrulama yapılmadı. Komut satırından bir önerme veya kod girin.
      </div>
    );
  }

  const isProven = result.status === "200_PROVEN";

  return (
    <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur-md">
      {/* Üst Başlık & Mühür Rozeti */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
              isProven
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
            }`}
          >
            STATUS: {result.status}
          </span>
          <span className="font-mono text-xs font-semibold text-zinc-300">
            Z3/Lean 4 Truth Certificate
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">{result.timestamp}</span>
      </div>

      {/* CID Hash & Metrikler */}
      <div className="grid grid-cols-2 gap-2 font-mono text-xs">
        <div className="rounded bg-zinc-900/60 p-2 border border-zinc-800/80">
          <span className="text-zinc-500 block text-[10px]">PROOF CID HASH</span>
          <span className="text-emerald-400 truncate block font-bold">{result.proofHash}</span>
        </div>
        <div className="rounded bg-zinc-900/60 p-2 border border-zinc-800/80">
          <span className="text-zinc-500 block text-[10px]">SLA GECİKME / ÜCRET</span>
          <span className="text-zinc-300 block">
            {result.latencyMs} ms | ${result.costCreditedUsd.toFixed(3)} USD
          </span>
        </div>
      </div>

      {/* İspat Adımları */}
      <div className="space-y-1 font-mono text-xs">
        <span className="text-zinc-400 text-[11px] font-semibold">İspat Adımları (Proof Trace):</span>
        <div className="rounded bg-black/60 p-2.5 border border-zinc-800 space-y-1">
          {result.steps.map((step, idx) => (
            <div key={idx} className="text-emerald-400/90 text-[11px] flex items-center gap-1.5">
              <span className="text-zinc-600">›</span> {step}
            </div>
          ))}
        </div>
      </div>

      {/* ZKP Root Signature Mühür Altbilgisi */}
      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-zinc-500 border-t border-zinc-800/60">
        <span>ROOT CA: TEDBİRGE-WEBOS-ZKP-ROOT-CA</span>
        <span className="text-emerald-500">✔ ZERO-KNOWLEDGE SEALED</span>
      </div>
    </div>
  );
};
