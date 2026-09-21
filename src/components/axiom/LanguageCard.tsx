/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/** Dil tanıma sonucu: tür, dil adı, yazı sistemi ve güven yüzdesi. */

import { t } from "@/lib/axiom/i18n";
import type { LangGuess } from "@/lib/axiom/lang/detect";

export function LanguageCard({ lang }: { lang: LangGuess | null }) {
  const kindLabel = !lang
    ? "—"
    : lang.kind === "human"
      ? t("lang.human")
      : lang.kind === "code"
        ? t("lang.code")
        : t("lang.unknown");
  const pct = lang ? Math.round(lang.confidence * 100) : 0;

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
        {t("lang.title")}
      </div>
      {lang ? (
        <div className="mt-2 space-y-2 font-osmono text-[11px] text-[var(--tb-text)]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[var(--tb-muted)]">{kindLabel}</span>
            <span className="text-sm text-[var(--tb-cyan-400)]">{lang.label}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-[var(--tb-muted)]">Yazı sistemi</span>
            <span>{lang.script}</span>
          </div>
          <div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--tb-muted)]">{t("lang.confidence")}</span>
              <span>%{pct}</span>
            </div>
            <div
              className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--tb-bg-soft)]"
              role="progressbar"
              aria-label={t("lang.confidence")}
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-[var(--tb-cyan-400)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <p className="text-[var(--tb-muted)]">{lang.reason}</p>
        </div>
      ) : (
        <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">
          Dil tanıma için bir metin ya da kod parçası gönderin.
        </p>
      )}
    </div>
  );
}
