/**
 * CANLI TELEMETRİ KAYNAĞI (tek doğruluk noktası)
 * ------------------------------------------------------------------
 * Panelde gösterilen her sayı buradan gelir. Hiçbir değer üretilmez;
 * ölçüm yoksa `null` döner ve arayüz "ölçüm yok" gösterir.
 *
 * Kaynaklar:
 *  - `node-runtime`  → eş listesi, kuyruk derinliği, çevrimiçi durumu
 *  - `mesh/link-metrics` → gerçek RTT / kalan bant genişliği / kalite
 *  - `kernel/telemetry`  → gönderim, rota ve hata sayaçları
 *  - `kernel-worker-bridge` → işçi + Wasm çekirdeği durumu
 */

import { useEffect, useState } from "react";

import { kernelWorkerInfo, type KernelWorkerInfo } from "@/kernel/kernel-worker-bridge";
import { kernelEvents, kernelMetrics, onKernelTelemetry } from "@/kernel/telemetry";
import { linkMetrics, weightFromMetrics } from "@/lib/mesh/link-metrics";
import { useNodeRuntime } from "@/lib/node-runtime";
import type { PeerInfo } from "@/lib/browser-node";

export type PeerTelemetry = {
  nodeId: string;
  direct: boolean;
  verified: boolean;
  /** Ölçülmediyse null. */
  rttMs: number | null;
  freeKbps: number | null;
  quality: number | null;
  /** Dijkstra kenar ağırlığı (Wasm ile aynı formül). */
  weight: number | null;
};

export type LiveTelemetry = {
  running: boolean;
  online: boolean;
  nodeId: string;
  peers: PeerTelemetry[];
  directPeers: number;
  queued: number;
  /** Ortalama RTT (ms) — ölçüm yoksa null. */
  avgRttMs: number | null;
  /** Ölçülen toplam kalan bant genişliği (kbps) — ölçüm yoksa null. */
  totalFreeKbps: number | null;
  sent: number;
  failed: number;
  routes: number;
  avgSendMs: number;
  lastError: string | null;
  droppedUnsigned: number;
  /** Sayfa/oturum çalışma süresi (ms). */
  uptimeMs: number;
  worker: KernelWorkerInfo;
};

const startedAt = Date.now();

function peerTelemetry(p: PeerInfo): PeerTelemetry {
  const m = linkMetrics(p.nodeId);
  const measured = m.at > 0;
  return {
    nodeId: p.nodeId,
    direct: p.direct,
    verified: Boolean(p.verified),
    rttMs: measured ? Math.round(m.rttMs) : null,
    freeKbps: measured ? Math.round(m.freeKbps) : null,
    quality: measured ? Number(m.quality.toFixed(2)) : null,
    weight: measured ? Number(weightFromMetrics(m).toFixed(3)) : null,
  };
}

/** Ölçüm yoksa null döndüren ortalama. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Süreyi "2s 14d" biçiminde okunur hâle getirir. */
export function formatUptime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) return `${d}g ${h}sa`;
  if (h > 0) return `${h}sa ${m}dk`;
  return `${m}dk`;
}

/** Ölçüm yoksa tire gösterir — asla uydurma değer basmaz. */
export function fmt(value: number | null, unit = "", digits = 0): string {
  if (value === null || !Number.isFinite(value)) return "ölçüm yok";
  return `${value.toFixed(digits)}${unit}`;
}

/**
 * Panel bileşenleri için canlı telemetri kancası.
 * 1 sn'lik tazeleme yalnız sekme görünürken çalışır (pil/CPU dostu).
 */
export function useLiveTelemetry(): LiveTelemetry {
  const node = useNodeRuntime();
  const [tick, setTick] = useState(0);
  const [worker, setWorker] = useState<KernelWorkerInfo>({ alive: false, wasm: false, abi: 0, protocol: 0, shared: false });

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      timer = setInterval(() => setTick((t) => t + 1), 1_000);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    const offKernel = onKernelTelemetry(() => setTick((t) => t + 1));
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      offKernel();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void kernelWorkerInfo().then((info) => {
      if (alive) setWorker(info);
    });
    return () => {
      alive = false;
    };
  }, []);

  void tick; // yeniden hesaplamayı tetikler

  const peers = node.peers.map(peerTelemetry);
  const metrics = kernelMetrics();
  const routes = kernelEvents().filter((e) => e.op === "route").length;
  const rtts = peers.map((p) => p.rttMs).filter((v): v is number => v !== null);
  const kbps = peers.map((p) => p.freeKbps).filter((v): v is number => v !== null);

  return {
    running: node.running,
    online: node.online,
    nodeId: node.nodeId,
    peers,
    directPeers: peers.filter((p) => p.direct).length,
    queued: node.queued,
    avgRttMs: mean(rtts),
    totalFreeKbps: kbps.length ? kbps.reduce((a, b) => a + b, 0) : null,
    sent: metrics.sent,
    failed: metrics.failed,
    routes,
    avgSendMs: metrics.avgSendMs,
    lastError: metrics.lastError,
    droppedUnsigned: node.droppedUnsigned,
    uptimeMs: Date.now() - startedAt,
    worker,
  };
}
