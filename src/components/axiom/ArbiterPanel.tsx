/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * HAKEM DÜĞÜM PANELİ (SAHTE İSPAT KORUMASI)
 * ------------------------------------------------------------------
 * Üç hakem düğümün bağımsız kararı, 2/3 çoğunluk sonucu ve sahte mühür
 * uyarısı. Hakemlere kanıt adımları ya da girdi metni gitmez.
 */

import { useMemo } from "react";

import { t } from "@/lib/axiom/i18n";
import { reviewProof } from "@/lib/axiom/net/arbiters";
import type { VerifyResult } from "@/lib/axiom/verify/types";

export function ArbiterPanel({ result }: { result: VerifyResult | null }) {
  const verdict = useMemo(() => (result ? reviewProof(result) : null), [result]);

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("arb.title")}
        </div>
        <span className="rounded border border-[var(--tb-border)] px-2 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]">
          {t("arb.simulated")}
        </span>
      </div>

      {!verdict ? (
        <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">{t("arb.empty")}</p>
      ) : (
        <>
          <div
            className="mt-2 rounded-lg border px-3 py-2 font-osmono text-[11px]"
            style={{
              borderColor: verdict.quorum ? "var(--tb-cyan-400)" : "var(--tb-rose-400)",
              color: verdict.quorum ? "var(--tb-cyan-400)" : "var(--tb-rose-400)",
            }}
          >
            {verdict.quorum ? t("arb.quorumOk") : t("arb.quorumFail")} · {verdict.accepted}/3
            {verdict.spoofed ? (
              <div className="mt-1 text-[var(--tb-rose-400)]">{t("arb.spoofed")}</div>
            ) : null}
          </div>

          <ul className="mt-2 space-y-1 font-osmono text-[11px]">
            {verdict.votes.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-[var(--tb-text)]">{v.id}</span>
                <span style={{ color: v.accepted ? "var(--tb-cyan-400)" : "var(--tb-rose-400)" }}>
                  {v.accepted ? t("arb.accept") : t("arb.reject")}
                </span>
                <span className="text-[var(--tb-muted)]">
                  {v.ms} ms · {v.reason}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
