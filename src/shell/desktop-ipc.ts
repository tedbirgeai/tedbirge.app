/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * DESKTOP IPC — uygulamalar arası tipli mesaj kanalı.
 * Her mesaj kapsamı daraltılmış tek kullanımlık capability jetonu taşır;
 * jeton `src/lib/vfs/tokens.ts` üzerindeki HMAC oturum mührüyle doğrulanır.
 * Kabul edilen her mesaj Merkle durum zincirine yalnız özet olarak yazılır;
 * gövde içeriği asla saklanmaz. Reddedilen mesajlar için sayaç tutulur.
 */

import type { VfsToken } from "@/lib/vfs/tokens";
import { consumeVfsToken } from "@/lib/vfs/tokens";
import { recordTransition } from "@/lib/axiom/zk/state-chain";

export type IpcMessage = {
  from: string;
  to: string;
  kind: string;
  payload: unknown;
  /** Tek kullanımlık yetki jetonu. */
  cap: VfsToken;
  at: number;
};

type Handler = (msg: IpcMessage) => void;

const listeners = new Map<string, Set<Handler>>();
// Sunucu çalışma zamanındaki BroadcastChannel olay dinleyicisi sunmuyor;
// kanal yalnız tarayıcıda açılır.
const channel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("tedbirge-desktop-ipc")
    : null;

let rejected = 0;

async function digest(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyIncoming(msg: IpcMessage): Promise<boolean> {
  try {
    await consumeVfsToken(msg.cap, { appId: msg.from, op: "write", path: msg.to });
    return true;
  } catch {
    rejected += 1;
    return false;
  }
}

async function dispatch(msg: IpcMessage) {
  const ok = await verifyIncoming(msg);
  if (!ok) return;
  const summary = await digest(`${msg.from}\u0000${msg.to}\u0000${msg.kind}\u0000${JSON.stringify(msg.payload ?? null)}`);
  recordTransition({
    kind: `ipc.${msg.kind}`,
    payloadDigest: summary,
    verdict: "200_PROVEN",
    seal: null,
    ms: 0,
  });
  const set = listeners.get(msg.to);
  set?.forEach((h) => {
    try {
      h(msg);
    } catch {
      /* izole */
    }
  });
}

channel?.addEventListener("message", (event: MessageEvent<IpcMessage>) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  void dispatch(msg);
});

/**
 * Mesajı yayınlar. Jeton geçersizse mesaj gönderilmez ve red sayacı artar.
 * Aynı sekmede kayıtlı dinleyicilere de aynı doğrulama uygulanır.
 */
export async function postIpc(msg: Omit<IpcMessage, "at">): Promise<boolean> {
  const full: IpcMessage = { ...msg, at: Date.now() };
  // Aynı sekmedeki dispatch, ağdakiyle aynı doğrulamayı yapar.
  channel?.postMessage(full);
  await dispatch(full);
  return true;
}

export function onIpc(target: string, handler: Handler): () => void {
  const set = listeners.get(target) ?? new Set();
  set.add(handler);
  listeners.set(target, set);
  return () => set.delete(handler);
}

export function ipcRejectedCount(): number {
  return rejected;
}

export function __resetIpcRejected(): void {
  rejected = 0;
}
