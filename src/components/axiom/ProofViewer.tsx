/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * KANIT GÖRÜNTÜLEYİCİ
 * ------------------------------------------------------------------
 * Motor rozeti, numaralı kanıt adımları, üretilen SMT-LIB/Lean önermesi,
 * içerik kimliği (CID), süre ve mühür kartı. Tüm renkler --tb-* token'ları.
 */

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/axiom/i18n";
import type { VerifyResult } from "@/lib/axiom/verify/types";

const ENGINE_LABEL: Record<VerifyResult["engine"], string> = {
  z3: "Z3 SMT",
  lean4: "Lean 4",
  local: "Yerel kural kapısı",
};

function verdictTone(verdict: VerifyResult["verdict"]): string {
  if (verdict === "200_PROVEN") return "var(--tb-cyan-400)";
  if (verdict === "422_UNDECIDED") return "var(--tb-muted)";
  return "var(--tb-rose-400)";
}

export function ProofViewer({ result }: { result: VerifyResult | null }) {
  const [showSource, setShowSource] = useState(false);

  if (!result) {
    return (
      <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("proof.title")}
        </div>
        <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">{t("proof.empty")}</p>
      </div>
    );
  }

  const tone = verdictTone(result.verdict);

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("proof.title")}
        </div>
        <div className="flex flex-wrap items-center gap-2 font-osmono text-[10px]">
          <span className="rounded border border-[var(--tb-border)] px-2 py-0.5 text-[var(--tb-text)]">
            {ENGINE_LABEL[result.engine]}
          </span>
          <span className="text-[var(--tb-muted)]">{result.ms} ms</span>
        </div>
      </div>

      {/* Mühür kartı */}
      <div
        className="mt-2 rounded-lg border px-3 py-2 font-osmono text-[11px]"
        style={{ borderColor: tone, color: tone }}
      >
        <div className="font-semibold">STATUS: {result.verdict}</div>
        <div className="mt-1 break-all text-[var(--tb-muted)]">CID: {result.cid}</div>
        {result.seal ? (
          <div className="mt-1 break-all" style={{ color: tone }}>
            {result.seal}
          </div>
        ) : (
          <div className="mt-1 text-[var(--tb-muted)]">{t("proof.noSeal")}</div>
        )}
        {!result.wasmVerified ? (
          <div className="mt-1 text-[var(--tb-muted)]">{t("proof.localOnly")}</div>
        ) : null}
      </div>

      {/* Adımlar */}
      {result.steps.length ? (
        <ol className="mt-3 space-y-1 font-osmono text-[11px] text-[var(--tb-text)]">
          {result.steps.map((s) => (
            <li key={s.index} className="flex gap-2">
              <span className="w-6 shrink-0 text-right text-[var(--tb-muted)]">{s.index}.</span>
              <span className="shrink-0 text-[var(--tb-cyan-400)]">{s.rule}</span>
              <span className="text-[var(--tb-muted)]">{s.detail}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 font-osmono text-[11px] text-[var(--tb-muted)]">{t("proof.noSteps")}</p>
      )}

      <Button
        type="button"
        onClick={() => setShowSource((v) => !v)}
        variant="outline"
        className="mt-3 h-7 border-[var(--tb-border)] px-2 py-1 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
      >
        {showSource ? t("proof.hideSource") : t("proof.showSource")}
      </Button>

      {showSource ? (
        <div className="mt-2 grid gap-2 lg:grid-cols-2">
          <pre className="max-h-56 overflow-auto rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[10px] text-[var(--tb-text)]">
            {result.smt}
          </pre>
          <pre className="max-h-56 overflow-auto rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[10px] text-[var(--tb-text)]">
            {result.lean}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
