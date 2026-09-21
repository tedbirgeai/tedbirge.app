/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * CRDT SENKRONİZASYON DURUMU
 * ------------------------------------------------------------------
 * Çevrimdışıyken mühür kayıtları yerel CRDT durumuna yazılır ve delta
 * kuyruğunda bekler; bağlantı gelince çakışmasız birleşir. Kart yalnız
 * CID ve karar taşır, girdi metni taşımaz.
 */

import { useCallback, useEffect, useState } from "react";

import { t } from "@/lib/axiom/i18n";
import { apply, createState, delta, live, put, type CrdtState } from "@/lib/axiom/sync/crdt";
import { createQueue, enqueue, flush, type QueueState } from "@/lib/axiom/sync/queue";
import type { VerifyResult } from "@/lib/axiom/verify/types";

export function SyncStatusCard({ result }: { result: VerifyResult | null }) {
  const [state, setState] = useState<CrdtState>(() => createState("bu-cihaz"));
  const [queue, setQueue] = useState<QueueState>(() => createQueue());
  const [online, setOnline] = useState(true);
  const [merged, setMerged] = useState(0);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Her yeni karar bir CRDT kaydı ve bir delta üretir.
  useEffect(() => {
    if (!result) return;
    setState((prev) => {
      const next = put(prev, result.cid, {
        verdict: result.verdict,
        seal: result.seal,
        engine: result.engine,
        ms: result.ms,
      });
      setQueue((q) => enqueue(q, delta(next, { [prev.node]: prev.vector[prev.node] ?? 0 })));
      return next;
    });
  }, [result]);

  const gonder = useCallback(async () => {
    // Taşıyıcı yokken gönderim başarısızdır: kayıt kuyrukta kalır.
    const out = await flush(queue, () => online, online);
    setQueue(out.state);
    if (out.sent) {
      // Karşı düğümün deltayı uygulaması: idempotent birleşme.
      setState((prev) => {
        const applied = apply(prev, delta(prev));
        setMerged((m) => m + applied.applied);
        return applied.state;
      });
    }
  }, [queue, online]);

  return (
    <div className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-muted)]">
          {t("sync.title")}
        </div>
        <span
          className="rounded border px-2 py-0.5 font-osmono text-[10px]"
          style={{
            borderColor: online ? "var(--tb-cyan-400)" : "var(--tb-border)",
            color: online ? "var(--tb-cyan-400)" : "var(--tb-muted)",
          }}
        >
          {online ? t("sync.online") : t("sync.offline")}
        </span>
      </div>

      <dl className="mt-2 space-y-1 font-osmono text-[11px] text-[var(--tb-text)]">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("sync.records")}</dt>
          <dd>{live(state).length}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("sync.pending")}</dt>
          <dd>{queue.pending.length}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("sync.sent")}</dt>
          <dd>{queue.sent}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--tb-muted)]">{t("sync.merged")}</dt>
          <dd>{merged}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => void gonder()}
        disabled={!queue.pending.length}
        className="mt-2 rounded-lg border border-[var(--tb-cyan-400)] px-3 py-1 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-cyan-400)] disabled:opacity-40"
      >
        {t("sync.flush")}
      </button>
      <p className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">{t("sync.note")}</p>
    </div>
  );
}
