/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * Değişmez eşleşme kartları ve bilim matrisi filtresi.
 * Uyarı: bu görünüm KANIT sunmaz; yalnız ilgi ve çelişki şüphesi bildirir.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Link2 } from "lucide-react";

import { t } from "@/lib/axiom/i18n";
import type { InvariantMatch } from "@/lib/axiom/invariants";
import { SCIENCE_CATEGORIES, type ScienceId } from "@/lib/axiom/registry";

export function InvariantMatrix({ matches }: { matches: InvariantMatch[] }) {
  const [filter, setFilter] = useState<ScienceId | "all">("all");

  const shown = useMemo(
    () => (filter === "all" ? matches : matches.filter((m) => m.invariant.category === filter)),
    [matches, filter],
  );

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("inv.title")}
        </div>
        <div className="font-osmono text-[10px] text-[var(--tb-muted)]">
          Kanıt üretilmez — simgesel doğrulama bağlı değil
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1" role="group" aria-label={t("science.title")}>
        <button
          type="button"
          onClick={() => setFilter("all")}
          aria-pressed={filter === "all"}
          className={`rounded-full border px-2 py-0.5 font-osmono text-[10px] ${
            filter === "all"
              ? "border-[var(--tb-cyan-400)] text-[var(--tb-cyan-400)]"
              : "border-[var(--tb-border)] text-[var(--tb-muted)]"
          }`}
        >
          Tümü
        </button>
        {SCIENCE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            aria-pressed={filter === c.id}
            title={c.summary}
            className={`rounded-full border px-2 py-0.5 font-osmono text-[10px] ${
              filter === c.id
                ? "border-[var(--tb-cyan-400)] text-[var(--tb-cyan-400)]"
                : "border-[var(--tb-border)] text-[var(--tb-muted)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {shown.length ? (
        <ul className="mt-3 space-y-2">
          {shown.map((m) => {
            const conflict = m.verdict === "celiski";
            return (
              <li
                key={m.invariant.id}
                className={`rounded-lg border p-2 font-osmono text-[11px] ${
                  conflict
                    ? "border-[var(--tb-rose-400)] bg-[var(--tb-bg-soft)]"
                    : "border-[var(--tb-border)]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {conflict ? (
                    <AlertTriangle className="h-3.5 w-3.5 text-[var(--tb-rose-400)]" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5 text-[var(--tb-cyan-400)]" />
                  )}
                  <span className="text-[var(--tb-text)]">{m.invariant.label}</span>
                  <span
                    className={conflict ? "text-[var(--tb-rose-400)]" : "text-[var(--tb-cyan-400)]"}
                  >
                    {conflict ? t("inv.conflict") : t("inv.related")}
                  </span>
                </div>
                <p className="mt-1 text-[var(--tb-muted)]">{m.invariant.statement}</p>
                <p className="mt-1 text-[var(--tb-text)]">{m.note}</p>
                <p className="mt-1 text-[var(--tb-muted)]">
                  {t("inv.ledger")}: {m.invariant.ledger}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 font-osmono text-[11px] text-[var(--tb-muted)]">{t("inv.none")}</p>
      )}
    </div>
  );
}
