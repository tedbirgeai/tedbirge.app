/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * EVRENSEL SDK VE DERLEYİCİ PANELİ
 * ------------------------------------------------------------------
 * Yedi hedef için istemci şablonu, beş dil için makro/annotation işareti
 * ve CI/CD denetim botu iş akışı. Tüm çıktılar kopyalanabilir metindir;
 * burada hiçbir paket yayımlanmaz, hiçbir dış çağrı yapılmaz.
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/axiom/i18n";
import { adapterSource, SDK_TARGETS, type SdkTarget } from "@/lib/axiom/sdk/adapters";
import { CI_ACTION_NAME, simulateCiRun, workflowYaml } from "@/lib/axiom/sdk/ci-bot";
import { MACROS } from "@/lib/axiom/sdk/compiler-macros";
import { SITE_URL } from "@/lib/site";

const CI_ORNEK = [
  { path: "src/enerji/butce.rs", verdict: "200_PROVEN" as const, ms: 41 },
  { path: "src/enerji/akis.py", verdict: "422_UNDECIDED" as const, ms: 27 },
  { path: "hdl/regulator.v", verdict: "200_PROVEN" as const, ms: 63 },
];

export function SdkPanel() {
  const [target, setTarget] = useState<SdkTarget>("node");
  const source = useMemo(() => adapterSource(target, SITE_URL), [target]);
  const workflow = useMemo(() => workflowYaml(SITE_URL), []);
  const ci = useMemo(() => simulateCiRun(CI_ORNEK), []);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("sdk.title")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {SDK_TARGETS.map((s) => (
            <Button
              key={s.id}
              type="button"
              onClick={() => setTarget(s.id)}
              variant="outline"
              className="h-7 rounded border px-2 py-1 font-osmono text-[10px]"
              style={{
                borderColor: target === s.id ? "var(--tb-cyan-400)" : "var(--tb-border)",
                color: target === s.id ? "var(--tb-cyan-400)" : "var(--tb-muted)",
              }}
            >
              {s.label}
            </Button>
          ))}
        </div>
        <pre className="mt-2 max-h-72 overflow-auto rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[10px] text-[var(--tb-text)]">
          {source}
        </pre>
      </div>

      <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("sdk.macros")}
        </div>
        <ul className="mt-2 space-y-2">
          {MACROS.map((m) => (
            <li key={m.id} className="font-osmono text-[11px]">
              <div className="text-[var(--tb-cyan-400)]">
                {m.marker} <span className="text-[var(--tb-muted)]">· {m.label}</span>
              </div>
              <div className="text-[var(--tb-muted)]">{m.behaviour}</div>
              <pre className="mt-1 overflow-x-auto rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 text-[10px] text-[var(--tb-text)]">
                {m.usage}
              </pre>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("sdk.ci")} · {CI_ACTION_NAME}
        </div>
        <pre className="mt-2 max-h-56 overflow-auto rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[10px] text-[var(--tb-text)]">
          {workflow}
        </pre>
        <div
          className="mt-2 font-osmono text-[11px]"
          style={{ color: ci.passed ? "var(--tb-cyan-400)" : "var(--tb-rose-400)" }}
        >
          {ci.passed ? t("sdk.ciPass") : t("sdk.ciFail")} · {ci.proven}/{ci.files.length}
        </div>
        <pre className="mt-2 max-h-40 overflow-auto rounded border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[10px] text-[var(--tb-muted)]">
          {ci.comment}
        </pre>
      </div>
    </div>
  );
}
