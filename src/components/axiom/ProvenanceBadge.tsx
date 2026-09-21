/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * PAKET KÖKEN ROZETİ KARTI
 * ------------------------------------------------------------------
 * Kanıtlanmış karar varsa altı paket deposu için rozet üretir; rozet
 * markdown'ı kopyalanabilir. Kanıtsız kararda rozet üretilmez.
 */

import { useMemo, useState } from "react";

import { t } from "@/lib/axiom/i18n";
import { makeBadge, REGISTRIES, type RegistryId } from "@/lib/axiom/sdk/provenance";
import type { VerifyResult } from "@/lib/axiom/verify/types";

export function ProvenanceBadge({ result }: { result: VerifyResult | null }) {
  const [registry, setRegistry] = useState<RegistryId>("npm");
  const [pkg, setPkg] = useState("tedbirge-axiom");
  const [kopyalandi, setKopyalandi] = useState(false);

  const badge = useMemo(
    () => (result ? makeBadge(registry, pkg.trim() || "paket", result.verdict, result.seal) : null),
    [registry, pkg, result],
  );

  const kopyala = async () => {
    if (!badge) return;
    try {
      await navigator.clipboard.writeText(badge.markdown);
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 1500);
    } catch {
      /* Pano izni yok: kullanıcı metni elle seçebilir. */
    }
  };

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
        {t("prov.title")}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={registry}
          onChange={(e) => setRegistry(e.target.value as RegistryId)}
          aria-label={t("prov.registry")}
          className="rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-2 py-1 font-osmono text-[11px] text-[var(--tb-text)]"
        >
          {REGISTRIES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <input
          value={pkg}
          onChange={(e) => setPkg(e.target.value)}
          aria-label={t("prov.package")}
          className="min-w-40 flex-1 rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-2 py-1 font-osmono text-[11px] text-[var(--tb-text)]"
        />
      </div>

      {badge ? (
        <>
          <div
            className="mt-2 overflow-x-auto text-[var(--tb-cyan-400)]"
            // Rozet SVG'si yerel olarak üretilir ve metinleri kaçışlanır; dış içerik yoktur.
            dangerouslySetInnerHTML={{ __html: badge.svg }}
          />
          <pre className="mt-2 overflow-x-auto rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[10px] text-[var(--tb-text)]">
            {badge.markdown}
          </pre>
          <button
            type="button"
            onClick={() => void kopyala()}
            className="mt-2 rounded border border-[var(--tb-cyan-400)] px-2 py-1 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-cyan-400)]"
          >
            {kopyalandi ? t("prov.copied") : t("prov.copy")}
          </button>
        </>
      ) : (
        <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">{t("prov.empty")}</p>
      )}
    </div>
  );
}
