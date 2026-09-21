/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * Ağ düğümü durumu (salt-okunur).
 * Mevcut Tedbirge düğümü okunur; AXIOM yeni bir bağlantı yığını kurmaz.
 */

import { Radio } from "lucide-react";

import { t } from "@/lib/axiom/i18n";
import { FREE_NODE_LIMIT, useAxiomNode } from "@/lib/axiom/net/node";

export function NodeStatusCard({ onOpenLicense }: { onOpenLicense?: () => void } = {}) {
  const node = useAxiomNode();
  const pro = node.status === "SUBSCRIPTION_REQUIRED";

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("node.title")}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-osmono text-[10px] ${
            pro
              ? "border-[var(--tb-rose-400)] text-[var(--tb-rose-400)]"
              : "border-[var(--tb-cyan-400)] text-[var(--tb-cyan-400)]"
          }`}
        >
          <Radio className="h-3 w-3" />
          {pro ? t("node.pro") : node.status === "NODE_OFFLINE" ? "NODE_OFFLINE" : t("node.free")}
        </span>
      </div>

      <dl className="mt-2 space-y-1 font-osmono text-[11px] text-[var(--tb-text)]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">Durum</dt>
          <dd>{node.text}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">Bağlantı yolu</dt>
          <dd>{node.path}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("node.peers")}</dt>
          <dd>
            {node.peers} / {FREE_NODE_LIMIT} ücretsiz
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">Yedek yollar</dt>
          <dd>
            {node.routes.reflector} yansıtıcı · {node.routes.relay} aktarma
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">Sırada bekleyen</dt>
          <dd>{node.queued}</dd>
        </div>
      </dl>

      <p className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">
        1–5 cihaz ücretsizdir. 6. cihazda düğüm lisansı gerekir; ödeme sağlayıcısı bağlı değildir.
      </p>

      {onOpenLicense ? (
        <button
          type="button"
          onClick={onOpenLicense}
          className="mt-2 rounded-lg border border-[var(--tb-border)] px-2 py-1 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-muted)]"
        >
          {t("lic.open")}
        </button>
      ) : null}
    </div>
  );
}
