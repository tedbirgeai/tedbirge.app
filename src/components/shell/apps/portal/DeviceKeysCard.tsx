/**
 * CİHAZ KOTASI VE DOĞRULANMIŞ DÜĞÜM ANAHTARLARI
 * ------------------------------------------------------------------
 * Anahtar gövdesi asla gösterilmez; yalnız kısa parmak izi görünür.
 */

import { Badge, GlassCard, ghostBtn } from "@/components/shell/apps/portal/ui";
import { FREE_DEVICE_LIMIT } from "@/lib/axiom/license/policy";
import { refreshPeerTrust, useNodeRuntime } from "@/lib/node-runtime";
import { quotaOf } from "@/lib/portal/live";

export function DeviceKeysCard() {
  const node = useNodeRuntime();
  const q = quotaOf(1 + node.peers.length, FREE_DEVICE_LIMIT);
  return (
    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">Cihaz kotası</h3>
        <span className="font-osmono text-[12px] text-[var(--tb-text)]">
          {q.used} / {q.limit} cihaz
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--tb-bg-soft)]"
        role="progressbar"
        aria-valuenow={q.pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full ${q.over ? "bg-[var(--tb-rose-500)]" : "bg-[var(--tb-accent)]"}`}
          style={{ width: `${q.pct}%` }}
        />
      </div>
      {q.over ? (
        <p className="mt-2 text-[12px] text-[var(--tb-rose-500)]">
          Abonelik gerekli: ücretsiz sınır {q.limit} cihaz.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">
          Doğrulanmış düğüm anahtarları
        </h3>
        <Badge tone="ok">E2EE</Badge>
        <Badge tone="ok">Sıfır-bilgi</Badge>
      </div>
      <ul className="mt-2 divide-y divide-[var(--tb-border)] text-[12px]">
        <li className="flex items-center justify-between gap-2 py-2">
          <span className="text-[var(--tb-text)]">Bu cihaz</span>
          <span className="font-osmono text-[var(--tb-muted)]">
            {node.fingerprint ? node.fingerprint.slice(0, 12) : "hazırlanıyor"}
          </span>
        </li>
        {node.peers.map((p) => (
          <li key={p.nodeId} className="flex items-center justify-between gap-2 py-2">
            <span className="truncate text-[var(--tb-text)]">{p.nodeId.slice(0, 12)}</span>
            <span className="flex items-center gap-2">
              <Badge tone={p.verified ? "ok" : p.trust === "changed" ? "bad" : "muted"}>
                {p.verified ? "Doğrulandı" : p.trust === "changed" ? "Değişti" : "Bekliyor"}
              </Badge>
              <span className="font-osmono text-[var(--tb-muted)]">
                {p.fingerprint?.slice(0, 12) ?? "—"}
              </span>
              <button
                type="button"
                className={ghostBtn}
                onClick={() => void refreshPeerTrust(p.nodeId)}
              >
                Yenile
              </button>
            </span>
          </li>
        ))}
      </ul>
      {node.peers.length === 0 ? (
        <p className="mt-1 text-[12px] text-[var(--tb-muted)]">Henüz bağlı eş yok.</p>
      ) : null}
    </GlassCard>
  );
}
