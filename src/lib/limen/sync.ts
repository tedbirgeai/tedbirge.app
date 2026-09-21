/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import {
  apply,
  createState,
  delta,
  live,
  put,
  type CrdtDelta,
  type CrdtState,
} from "@/lib/axiom/sync/crdt";
import { createQueue, enqueue, flush, type QueueState } from "@/lib/axiom/sync/queue";
import { mountLimenRecord, type LimenMount } from "@/lib/limen/mount";

export type LimenMirrorMode = "local" | "p2p" | "github";

export type LimenRecord = {
  id: string;
  name: string;
  branch: string;
  mode: LimenMirrorMode;
  status: "queued" | "synced" | "conflict-free";
  updatedAt: number;
};

export type LimenSyncSnapshot = {
  node: string;
  online: boolean;
  peers: number;
  records: LimenRecord[];
  pending: number;
  sent: number;
  lastFlush: number | null;
  /** Depoya (repo/) mount edilmiş paketler. */
  mounts: LimenMount[];
  /** Mount sırasında oluşan son hata (yoksa null). */
  mountError: string | null;
};

type LimenWire = { type: "limen.delta" | "limen.hello"; delta?: CrdtDelta; node?: string };

type Listener = () => void;

const listeners = new Set<Listener>();
const channelName = "tedbirge-limen-delta-sync";
const nodeId = `limen-${Math.random().toString(36).slice(2, 8)}`;
let state: CrdtState = createState(nodeId);
let queue: QueueState = createQueue();
let peers = 1;
let channel: BroadcastChannel | null = null;
let netWatch = false;
let mounts: Record<string, LimenMount> = {};
let mountError: string | null = null;
let mounting = false;
let pumping = false;


function emit() {
  listeners.forEach((listener) => listener());
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === "undefined") return channel;
  channel = new BroadcastChannel(channelName);
  channel.addEventListener("message", (event: MessageEvent<LimenWire>) => {
    const data = event.data;
    if (data?.type === "limen.hello") {
      peers = Math.max(peers, 2);
      invalidate();
      return;
    }
    if (data?.type === "limen.delta" && data.delta) {
      const result = apply(state, data.delta);
      state = result.state;
      if (result.applied > 0) invalidate();
    }
  });
  channel.postMessage({ type: "limen.hello", node: nodeId } satisfies LimenWire);
  return channel;
}

function toRecords(current: CrdtState): LimenRecord[] {
  return live(current)
    .map((entry) => ({
      id: entry.key,
      name: String(entry.fields.name ?? entry.key),
      branch: String(entry.fields.branch ?? "main"),
      mode: (entry.fields.mode === "github" || entry.fields.mode === "p2p"
        ? entry.fields.mode
        : "local") as LimenMirrorMode,
      status: (entry.fields.status === "synced" || entry.fields.status === "conflict-free"
        ? entry.fields.status
        : "queued") as LimenRecord["status"],
      updatedAt: Number(entry.fields.updatedAt ?? Date.now()),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Anlık görüntü önbelleği: `useSyncExternalStore` her okumada aynı nesneyi
 * görmelidir. Aksi halde React sonsuz yeniden çizim döngüsüne girer (#185).
 */
let cache: LimenSyncSnapshot | null = null;

function build(): LimenSyncSnapshot {
  return {
    node: nodeId,
    online: typeof navigator === "undefined" ? true : navigator.onLine,
    peers,
    records: toRecords(state),
    pending: queue.pending.length,
    sent: queue.sent,
    lastFlush: queue.lastFlush,
  };
}

function snapshot(): LimenSyncSnapshot {
  if (!cache) cache = build();
  return cache;
}

function invalidate() {
  cache = null;
  emit();
}

function ensureNetworkWatch() {
  if (typeof window === "undefined" || netWatch) return;
  netWatch = true;
  window.addEventListener("online", invalidate);
  window.addEventListener("offline", invalidate);
}

export function subscribeLimen(listener: Listener) {
  ensureChannel();
  ensureNetworkWatch();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getLimenSnapshot(): LimenSyncSnapshot {
  ensureChannel();
  return snapshot();
}

/** Hata sonrası yeniden başlatmada yerel görünüm durumunu sıfırlar. */
export function resetLimenView() {
  cache = null;
  peers = typeof BroadcastChannel === "undefined" ? 1 : peers;
  emit();
}

export function stageLimenChange(name: string, mode: LimenMirrorMode = "p2p"): LimenSyncSnapshot {
  const id = `repo:${name.toLocaleLowerCase("tr").replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ-]+/gi, "-") || "workspace"}`;
  state = put(state, id, {
    name,
    branch: "main",
    mode,
    status: mode === "local" ? "queued" : "conflict-free",
    updatedAt: Date.now(),
  });
  queue = enqueue(queue, delta(state));
  invalidate();
  return snapshot();
}

export async function flushLimen(): Promise<LimenSyncSnapshot> {
  const ch = ensureChannel();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const result = await flush(
    queue,
    async (d) => {
      if (!ch) return false;
      ch.postMessage({ type: "limen.delta", delta: d, node: nodeId } satisfies LimenWire);
      return true;
    },
    online,
  );
  queue = result.state;
  if (result.sent > 0) {
    for (const record of toRecords(state)) {
      state = put(state, record.id, { ...record, status: "synced", updatedAt: Date.now() });
    }
  }
  invalidate();
  return snapshot();
}

// İlk açılışta çalışan, sahte olmayan yerel çalışma alanları.
state = put(state, "repo:tedbirge-webos", {
  name: "Tedbirge WebOS",
  branch: "main",
  mode: "p2p",
  status: "conflict-free",
  updatedAt: Date.now() - 18_000,
});
state = put(state, "repo:axiom-nodes", {
  name: "AXIOM Nodes",
  branch: "verify/v12",
  mode: "local",
  status: "queued",
  updatedAt: Date.now() - 52_000,
});
queue = enqueue(queue, delta(state));
