import { Modal } from "@/components/shell/apps/portal/ui";
import type { MapNode } from "@/lib/portal/live";

const HEALTH_LABEL = { ok: "Etkin", warn: "Uyarı / gecikme", error: "Bağlantı yok" } as const;

export function NodeDetailModal({ node, onClose }: { node: MapNode | null; onClose: () => void }) {
  const rows: [string, string][] = node
    ? [
        ["Düğüm kimliği", node.id],
        ["Durum", HEALTH_LABEL[node.health]],
        ["İşletim sistemi", node.os],
        ["Bellek", node.memoryPct === null ? "ölçülmedi" : `%${node.memoryPct} (hedef < 50 MB)`],
        ["Gecikme", node.latency === null ? "ölçülmedi" : `${node.latency} ms`],
        ["Anlık rol", node.role],
        ["Kaynak", node.live ? "Canlı eş" : "Portal kaydı"],
      ]
    : [];
  return (
    <Modal open={node !== null} title={node?.label ?? ""} onClose={onClose}>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-[var(--tb-muted)]">{k}</dt>
            <dd className="truncate font-osmono text-[var(--tb-text)]" title={v}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
