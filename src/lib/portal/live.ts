/**
 * PORTAL CANLI ÖZETİ
 * ------------------------------------------------------------------
 * Durum barı, ağ haritası ve otonom rozeti için tek kaynak. Değerler
 * sabit yazılmaz: portal düğümleri + tarayıcı düğümünün canlı eşleri ve
 * taşıyıcı zamanlayıcısının anlık görüntüsünden hesaplanır.
 */

import { BRIDGEABLE_CARRIERS } from "@/lib/carrier-bridge";
import type { SchedulerSnapshot } from "@/lib/carrier-scheduler";
import type { PortalNode } from "@/lib/portal/types";
import { spectrumLimitFor } from "@/lib/regulation";

export type LivePeer = { nodeId: string; state: string; verified?: boolean };

export type MapHealth = "ok" | "warn" | "error";

export type MapNode = {
  id: string;
  label: string;
  health: MapHealth;
  latency: number | null;
  memoryPct: number | null;
  role: "röle" | "uç" | "köprü";
  os: string;
  live: boolean;
};

/** Gecikme eşiği: bunun üstü "uyarı". */
export const WARN_LATENCY_MS = 250;

export function healthOf(n: Pick<PortalNode, "status" | "latency">): MapHealth {
  if (n.status === "cevrimdisi") return "error";
  if (n.status === "bekleme" || n.latency > WARN_LATENCY_MS) return "warn";
  return "ok";
}

export function buildMapNodes(nodes: PortalNode[], peers: LivePeer[], selfId: string): MapNode[] {
  const out: MapNode[] = [
    { id: selfId || "bu-cihaz", label: "Bu cihaz", health: "ok", latency: 0, memoryPct: null, role: "köprü", os: "Tedbirge® WebOS", live: true },
  ];
  for (const p of peers) {
    const health: MapHealth =
      p.state === "connected" ? "ok" : p.state === "failed" || p.state === "closed" ? "error" : "warn";
    out.push({ id: p.nodeId, label: p.nodeId.slice(0, 10), health, latency: null, memoryPct: null, role: "uç", os: "Tedbirge® WebOS", live: true });
  }
  for (const n of nodes) {
    out.push({
      id: n.id,
      label: n.label,
      health: healthOf(n),
      latency: n.latency,
      memoryPct: n.memory,
      role: n.quality >= 80 ? "röle" : "uç",
      os: "Tedbirge® WebOS",
      live: false,
    });
  }
  return out;
}

export type StatusSummary = { active: number; rttMs: number | null; meshBytes: number | null; sample: boolean };

export function statusSummary(
  nodes: PortalNode[],
  peers: LivePeer[],
  rttMs: number | null,
  seeded: boolean,
): StatusSummary {
  const activeNodes = nodes.filter((n) => n.status !== "cevrimdisi");
  const livePeers = peers.filter((p) => p.state === "connected");
  const lat = [...activeNodes.map((n) => n.latency), ...(rttMs !== null ? [rttMs] : [])];
  return {
    active: activeNodes.length + livePeers.length,
    rttMs: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
    meshBytes: null, // bayt sayacı yok: ölçülmeden değer uydurulmaz
    sample: seeded,
  };
}

export function formatStatus(s: StatusSummary): string {
  const rtt = s.rttMs === null ? "— ms RTT" : `${s.rttMs} ms RTT`;
  const mb = s.meshBytes === null ? "Mesh ölçülmedi" : `${Math.round(s.meshBytes / 1_048_576)} MB Mesh`;
  return `${s.active} cihaz aktif | ${rtt} | ${mb}`;
}

export type Autonomy = {
  tone: MapHealth;
  text: string;
  region: string;
  carriersOpen: number;
  carriersTotal: number;
  detail: string;
};

export function autonomyOf(snap: SchedulerSnapshot): Autonomy {
  const limit = spectrumLimitFor(snap.region);
  const total = BRIDGEABLE_CARRIERS.length;
  const open = BRIDGEABLE_CARRIERS.filter((c) => !limit.disabled.includes(c.id)).length;
  let tone: MapHealth = "ok";
  let detail = "Tüm yayınlar bölge sınırları içinde.";
  if (snap.nextWindowAt !== null || snap.ratio >= 1) {
    tone = "error";
    detail = "Yayın süresi bütçesi doldu; pencere açılana kadar gönderim bekletiliyor.";
  } else if (snap.blocked > 0 || snap.ratio >= 0.8) {
    tone = "warn";
    detail = `${snap.blocked} gönderim bölge kuralı nedeniyle kısıtlandı.`;
  }
  const text =
    tone === "ok"
      ? "Yasal Sınırlar İçinde Otonom Çalışıyor"
      : tone === "warn"
        ? "Otonom — Kısıtlı Kip"
        : "Otonom — Yayın Bekletiliyor";
  return { tone, text, region: snap.region, carriersOpen: open, carriersTotal: total, detail };
}

/** Harita üzerinde tıklanan düğümü bulur (daire isabet testi). */
export function hitTest(
  points: { id: string; x: number; y: number }[],
  x: number,
  y: number,
  radius = 14,
): string | null {
  let best: string | null = null;
  let bestD = radius * radius;
  for (const p of points) {
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d <= bestD) {
      bestD = d;
      best = p.id;
    }
  }
  return best;
}

/** Düğümleri çember üzerinde deterministik yerleştirir; merkez bu cihazdır. */
export function layout(ids: string[], w: number, h: number): { id: string; x: number; y: number }[] {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.max(40, Math.min(w, h) / 2 - 36);
  return ids.map((id, i) => {
    if (i === 0) return { id, x: cx, y: cy };
    const a = ((i - 1) / Math.max(1, ids.length - 1)) * Math.PI * 2 - Math.PI / 2;
    return { id, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

export type Quota = { used: number; limit: number; pct: number; over: boolean };

/** Ücretsiz kademe cihaz kotası: sınırı aşan (6.) cihazda abonelik gerekir. */
export function quotaOf(used: number, limit: number): Quota {
  return { used, limit, pct: Math.min(100, Math.round((used / limit) * 100)), over: used > limit };
}
