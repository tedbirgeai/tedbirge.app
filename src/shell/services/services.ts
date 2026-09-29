/**
 * WEBOS ARKA PLAN SERVİSLERİ — tek kayıt noktası.
 */

import { useSyncExternalStore } from "react";

import { setupOfflineSupport } from "@/lib/pwa";
import { bootNodeRuntime, startNode } from "@/lib/node-runtime";
import { bootAccessEngine } from "@/lib/access-tiers";
import { ensureOfflineGrant } from "@/lib/offline-license";
import { syncViewportUnits } from "@/lib/ui/viewport";
import { reportRuntimeError } from "@/lib/error-reporting";
import { createLinkHub, onGossipLink, openLocalLink } from "@/lib/axiom/net/datachannel";
import { createMeshDaemon, type MeshDaemon } from "@/lib/axiom/net/mesh-daemon";
import { onIpc } from "@/shell/desktop-ipc";
import {
  createServiceManager,
  type ServiceDef,
  type ServiceEvent,
  type ServiceInfo,
} from "@/shell/services/registry";

let mesh: MeshDaemon | null = null;
export const meshDaemon = () => mesh;

const defs: ServiceDef[] = [
  { name: "offline-support", start: () => setupOfflineSupport() },
  { name: "node-runtime", start: () => bootNodeRuntime() },
  { name: "node-start", deps: ["node-runtime"], start: () => startNode() },
  { name: "access-engine", deps: ["node-runtime"], start: () => bootAccessEngine() },
  { name: "offline-license", start: () => ensureOfflineGrant() },
  { name: "viewport", start: () => syncViewportUnits() },
  {
    name: "mesh-sync",
    deps: ["node-runtime"],
    start: () => {
      const id = `tab-${Math.random().toString(36).slice(2, 10)}`;
      // Yerel sekme bağlantısı + WebRTC eş kanalları tek merkezde.
      const hub = createLinkHub();
      hub.add(openLocalLink());
      const offLinks = onGossipLink((link) => hub.add(link));
      mesh = createMeshDaemon(id, hub);
      const offIpc = onIpc("mesh-sync", (msg) => {
        const p = msg.payload as { digest?: unknown; claim?: unknown } | null;
        if (p && typeof p.digest === "string") {
          mesh?.publish(p.digest, typeof p.claim === "string" ? p.claim : undefined);
        }
      });
      const flush = setInterval(() => mesh?.flush(), 2000);
      return () => {
        clearInterval(flush);
        offIpc();
        offLinks();
        mesh?.stop();
        mesh = null;
      };
    },
    health: () => mesh !== null,
  },
];

let leader = false;
const leaderSubs = new Set<() => void>();
export function markLeader() {
  leader = true;
  leaderSubs.forEach((fn) => fn());
}
export function useIsLeader(): boolean {
  return useSyncExternalStore(
    (fn) => {
      leaderSubs.add(fn);
      return () => void leaderSubs.delete(fn);
    },
    () => leader,
    () => false,
  );
}

let manager: ReturnType<typeof createServiceManager> | null = null;

export function serviceManager() {
  if (!manager) {
    manager = createServiceManager(defs, { heartbeatMs: 5000 });
    // Uzaktan yeniden başlatma yalnız IPC ile: desktop-ipc jetonu doğrulamadan dinleyiciye iletmez.
    onIpc("service-manager", (msg) => {
      const p = msg.payload as { name?: unknown } | null;
      if (msg.kind === "restart" && p && typeof p.name === "string") void manager?.restart(p.name);
    });
    manager.subscribe(() => {
      const last = manager?.events().at(-1);
      if (last && (last.status === "failed" || last.status === "degraded")) {
        reportRuntimeError(new Error(last.detail ?? last.status), {
          boundary: "boot",
          service: last.name,
        });
      }
    });
  }
  return manager;
}

const EMPTY: ServiceInfo[] = [];

export function useServices(): ServiceInfo[] {
  return useSyncExternalStore(
    (fn) => serviceManager().subscribe(fn),
    () => serviceManager().list(),
    () => EMPTY,
  );
}

let eventsCache: ServiceEvent[] = [];
let eventsLen = -1;
const NO_EVENTS: ServiceEvent[] = [];

export function useServiceEvents(): ServiceEvent[] {
  return useSyncExternalStore(
    (fn) => serviceManager().subscribe(fn),
    () => {
      const all = serviceManager().events();
      if (all.length !== eventsLen || all.at(-1) !== eventsCache.at(-1)) {
        eventsCache = all;
        eventsLen = all.length;
      }
      return eventsCache;
    },
    () => NO_EVENTS,
  );
}

/** WebRTC eş kanalını (mesh-sync) kullanıcı isteğiyle açar/kapatır. */
export async function setPeerLinkEnabled(on: boolean) {
  const m = serviceManager();
  if (on) await m.start("mesh-sync");
  else m.stop("mesh-sync");
}
