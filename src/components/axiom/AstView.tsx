/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/** Açılır-kapanır yapı ağacı görünümü (ASK ASCII/1.0 çıktısı). */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { t } from "@/lib/axiom/i18n";
import type { AstNode } from "@/lib/axiom/lang/ask-ascii";

function Branch({ node, depth }: { node: AstNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const shown = hasChildren ? node.children.slice(0, 60) : [];

  return (
    <li className="font-osmono text-[11px]">
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1 rounded px-1 text-[var(--tb-text)] hover:bg-[var(--tb-bg-soft)]"
          >
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <span>{node.label}</span>
            <span className="text-[var(--tb-muted)]">({node.children.length})</span>
          </button>
        ) : (
          <span className="px-1">
            <span className="text-[var(--tb-cyan-400)]">{node.type}</span>{" "}
            <span className="text-[var(--tb-text)]">{node.label}</span>
          </span>
        )}
      </div>
      {hasChildren && open ? (
        <ul className="ml-3 border-l border-[var(--tb-border)] pl-2">
          {shown.map((child, i) => (
            <Branch key={`${child.type}-${child.label}-${i}`} node={child} depth={depth + 1} />
          ))}
          {node.children.length > shown.length ? (
            <li className="px-1 text-[var(--tb-muted)]">
              … {node.children.length - shown.length} düğüm daha
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

export function AstView({
  ast,
  metrics,
}: {
  ast: AstNode | null;
  metrics: { nodes: number; depth: number } | null;
}) {
  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("ast.title")}
        </div>
        {metrics ? (
          <div className="font-osmono text-[10px] text-[var(--tb-muted)]">
            {t("ast.nodes")} {metrics.nodes} · {t("ast.depth")} {metrics.depth}
          </div>
        ) : null}
      </div>
      {ast ? (
        <ul className="mt-2 max-h-56 overflow-y-auto">
          <Branch node={ast} depth={0} />
        </ul>
      ) : (
        <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">
          Ağaç üretmek için bir girdi gönderin.
        </p>
      )}
    </div>
  );
}
