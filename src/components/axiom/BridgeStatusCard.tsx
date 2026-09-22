/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * GERÇEKLİK KÖPRÜSÜ DURUMU
 * ------------------------------------------------------------------
 * Masaüstünde yerel soket, tarayıcıda güvenli WebSocket kullanılır.
 * Sunucu yoksa kart bunu açıkça yazar; doğrulama yerel motorda sürer.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import { Cable } from "lucide-react";

import {
  getBridgeEvents,
  initialBridgeState,
  openTruthBridge,
  subscribeBridgeEvents,
  TRUTH_SOCKET_PATH,
  TRUTH_WSS_URL,
  type BridgeState,
} from "@/lib/axiom/bridge";
import { t } from "@/lib/axiom/i18n";

export function BridgeStatusCard() {
  const [state, setState] = useState<BridgeState>(() => initialBridgeState("none"));

  useEffect(() => {
    let alive = true;
    let close: (() => void) | null = null;
    void openTruthBridge((next) => {
      if (alive) setState(next);
    })
      .then((bridge) => {
        close = bridge.close;
        if (alive) setState(bridge.state());
      })
      .catch(() => {
        if (alive) setState(initialBridgeState("none"));
      });
    return () => {
      alive = false;
      close?.();
    };
  }, []);

  const label =
    state.transport === "unix"
      ? `${t("bridge.unix")} · ${TRUTH_SOCKET_PATH}`
      : state.transport === "wss"
        ? `${t("bridge.wss")} · ${TRUTH_WSS_URL}`
        : t("bridge.none");

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("bridge.title")}
        </div>
        <span
          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-osmono text-[10px] ${
            state.connected
              ? "border-[var(--tb-cyan-400)] text-[var(--tb-cyan-400)]"
              : "border-[var(--tb-border)] text-[var(--tb-muted)]"
          }`}
        >
          <Cable className="h-3 w-3" />
          {state.connected ? t("bridge.connected") : t("bridge.waiting")}
        </span>
      </div>

      <dl className="mt-2 space-y-1 font-osmono text-[11px] text-[var(--tb-text)]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("bridge.transport")}</dt>
          <dd className="break-all text-right">{label}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("bridge.latency")}</dt>
          <dd>{state.latencyMs === null ? "—" : `${state.latencyMs} ms`}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("bridge.attempts")}</dt>
          <dd>{state.attempts}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("bridge.pending")}</dt>
          <dd>{state.pending}</dd>
        </div>
      </dl>

      {events.length ? (
        <ul className="mt-2 space-y-1 border-t border-[var(--tb-border)] pt-2">
          {events.slice(0, 4).map((event) => (
            <li
              key={`${event.at}-${event.code}`}
              className={`flex items-start justify-between gap-2 font-osmono text-[10px] ${
                event.severity === "error"
                  ? "text-[var(--tb-danger)]"
                  : event.severity === "warn"
                    ? "text-[var(--tb-text)]"
                    : "text-[var(--tb-muted)]"
              }`}
            >
              <span>{event.note}</span>
              <span className="shrink-0 text-[var(--tb-muted)]">
                {new Date(event.at).toLocaleTimeString("tr-TR")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">
        {state.note} · {t("bridge.note")}
      </p>
    </div>
  );
}
