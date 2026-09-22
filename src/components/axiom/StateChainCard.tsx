/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * DURUM ZİNCİRİ KARTI (FAZ 3)
 * ------------------------------------------------------------------
 * Kanıtlanmış durum geçişlerini ve Merkle kök özetini gösterir.
 * Kart ham veri göstermez: yalnız geçiş türü, kısa kök özeti ve karar.
 */

import { useEffect, useSyncExternalStore } from "react";

import { t } from "@/lib/axiom/i18n";
import type { VerifyResult } from "@/lib/axiom/verify/types";
import { payloadDigest, recordVerifiedTransition } from "@/lib/axiom/zk/execute";
import { proofPath, verifyProof } from "@/lib/axiom/zk/merkle";
import { getChain, subscribeChain } from "@/lib/axiom/zk/state-chain";

const kisa = (digest: string) => digest.slice(-12);

export function StateChainCard({ result }: { result: VerifyResult | null }) {
  const chain = useSyncExternalStore(subscribeChain, getChain, getChain);

  // Her yeni karar bir durum geçişi denemesidir; yalnız mühürlü karar zincire girer.
  useEffect(() => {
    if (!result) return;
    recordVerifiedTransition(
      "axiom.dogrulama",
      payloadDigest({ cid: result.cid, engine: result.engine }),
      result,
    );
  }, [result]);

  const last = chain.transitions[chain.transitions.length - 1] ?? null;
  const pathOk =
    last !== null &&
    verifyProof(last.leaf, proofPath(chain.leaves, chain.leaves.length - 1), chain.root);

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("zk.title")}
        </div>
        {last ? (
          <span
            className="rounded border px-2 py-0.5 font-osmono text-[10px]"
            style={{
              borderColor: pathOk ? "var(--tb-cyan-400)" : "var(--tb-border)",
              color: pathOk ? "var(--tb-cyan-400)" : "var(--tb-muted)",
            }}
          >
            {pathOk ? t("zk.verified") : t("zk.broken")}
          </span>
        ) : null}
      </div>

      <dl className="mt-2 space-y-1 font-osmono text-[11px] text-[var(--tb-text)]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("zk.root")}</dt>
          <dd className="truncate">…{kisa(chain.root)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("zk.steps")}</dt>
          <dd>{chain.transitions.length + chain.compacted}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("zk.rejected")}</dt>
          <dd>{chain.rejected}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("zk.compacted")}</dt>
          <dd>{chain.compacted}</dd>
        </div>
      </dl>

      {chain.transitions.length === 0 ? (
        <p className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">{t("zk.empty")}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {chain.transitions
            .slice(-4)
            .reverse()
            .map((item) => (
              <li
                key={`${item.seq}-${item.leaf}`}
                className="flex items-center justify-between gap-2 font-osmono text-[10px] text-[var(--tb-text)]"
              >
                <span className="truncate">
                  #{item.seq} · {item.kind}
                </span>
                <span className="shrink-0 text-[var(--tb-muted)]">
                  …{kisa(item.root)} · {item.ms} ms
                </span>
              </li>
            ))}
        </ul>
      )}

      <p className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">{t("zk.note")}</p>
    </div>
  );
}
