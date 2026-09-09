/**
 * TARAYICI SİSTEM KÖPRÜSÜ
 * ------------------------------------------------------------------
 * Terminal komutlarını gerçek kabuk katmanlarına bağlar: pencere
 * yöneticisi, mesh hat ölçümleri, çekirdek telemetrisi, WebGPU ve
 * cihaz kimliği. Ölçülemeyen değerler `null` döner.
 */

import { kernelEvents, kernelMetrics } from "@/kernel/telemetry";
import { getBrowserNodeId } from "@/lib/browser-node";
import { diagnosticsSnapshot } from "@/lib/diagnostics";
import { ensureIdentity, getIdentity } from "@/lib/crypto/identity";
import { knownLinks, linkMetrics } from "@/lib/mesh/link-metrics";
import { releaseUrls } from "@/lib/vfs/store";
import { closeWindow, getWindows, openWindow } from "@/shell/windows";
import { LOCAL_APPS } from "@/shell/installed";

import type { GpuInfo, TerminalHost } from "./host";

const VAULT_KEY = "tedbirge.vault.locked";

function nodeId(): string | null {
  try {
    return getBrowserNodeId();
  } catch {
    return null;
  }
}

function heap(): { used: number | null; limit: number | null } {
  if (typeof performance === "undefined") return { used: null, limit: null };
  const m = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
    .memory;
  if (!m?.jsHeapSizeLimit) return { used: null, limit: null };
  return {
    used: Math.round(m.usedJSHeapSize / 1048576),
    limit: Math.round(m.jsHeapSizeLimit / 1048576),
  };
}

/** Bir kare süresi ölçerek FPS tahmini üretir. */
async function measureFps(): Promise<number | null> {
  if (typeof requestAnimationFrame === "undefined") return null;
  return new Promise((resolve) => {
    let frames = 0;
    const start = performance.now();
    const step = () => {
      frames += 1;
      if (performance.now() - start >= 300) {
        resolve(Math.round((frames * 1000) / (performance.now() - start)));
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export const browserHost: TerminalHost = {
  processes: () =>
    getWindows().map((w, i) => ({
      pid: 100 + i,
      name: w.title,
      appId: w.appId,
      memMb: null,
    })),

  kill(pid) {
    const list = getWindows();
    const target = list[pid - 100];
    if (!target) return false;
    closeWindow(target.id);
    return true;
  },

  open(appId, arg) {
    const app = LOCAL_APPS.find((a) => a.id === appId);
    if (!app) return false;
    openWindow(app.id, arg ? `${app.label} — ${arg}` : app.label);
    return true;
  },

  mesh() {
    const peers = knownLinks().map((id) => {
      const m = linkMetrics(id);
      return {
        id,
        rttMs: m.at ? Math.round(m.rttMs) : null,
        kbps: m.at ? Math.round(m.freeKbps) : null,
      };
    });
    const snap = diagnosticsSnapshot();
    return {
      nodeId: nodeId(),
      mode: peers.length
        ? `eşler arası · kuyruk ${snap.queued}`
        : `bağlı düğüm yok · kuyruk ${snap.queued}`,
      peers,
    };
  },

  async ping(peer) {
    const m = linkMetrics(peer);
    return m.at ? Math.round(m.rttMs) : null;
  },

  async gpu(): Promise<GpuInfo> {
    let adapter: string | null = null;
    try {
      const gpuApi = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } })
        .gpu;
      if (gpuApi) adapter = (await gpuApi.requestAdapter()) ? "WebGPU hazır" : null;
    } catch {
      adapter = null;
    }
    return { adapter, fps: await measureFps() };
  },

  wasm() {
    const h = heap();
    const m = kernelMetrics();
    return {
      provider: m.sent + m.failed > 0 ? "çekirdek etkin" : "çekirdek boşta",
      heapMb: h.used,
      limitMb: h.limit,
    };
  },

  logs(limit) {
    return kernelEvents()
      .slice(0, limit)
      .map(
        (e) =>
          `${new Date(e.at).toLocaleTimeString("tr-TR")} ${e.ok ? "OK " : "HATA"} ${e.op} ${e.detail} ${e.ms}ms`,
      );
  },

  events(limit) {
    return kernelEvents()
      .slice(0, limit)
      .map((e) => `${e.op}\t${e.detail}\t${e.ok ? "ok" : "hata"}`);
  },

  ipc() {
    const m = kernelMetrics();
    return [
      `gonderilen : ${m.sent}`,
      `basarisiz  : ${m.failed}`,
      `ort. sure  : ${m.avgSendMs} ms`,
      `son hata   : ${m.lastError ?? "yok"}`,
    ];
  },

  vaultLocked() {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(VAULT_KEY) === "1";
  },

  setVaultLocked(locked) {
    if (typeof localStorage === "undefined") return;
    if (locked) {
      localStorage.setItem(VAULT_KEY, "1");
      releaseUrls();
    } else {
      localStorage.removeItem(VAULT_KEY);
    }
  },

  keypair() {
    return { nodeId: nodeId(), publicKey: null };
  },

  async generateKeypair() {
    const id = nodeId();
    if (!id) return null;
    const existing = await getIdentity(id);
    const ident = existing ?? (await ensureIdentity(id));
    return ident.fingerprint ?? null;
  },

  memoryMb: () => heap().used,

  uptimeSec: () => (typeof performance === "undefined" ? 0 : Math.round(performance.now() / 1000)),
};
