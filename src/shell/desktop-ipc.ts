/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * DESKTOP IPC — uygulamalar arası tipli mesaj kanalı.
 * Aynı sekmede çalışan .tbapp pencereleri arası tek yönlü post; imzalı
 * capability token doğrulaması. BroadcastChannel yoksa no-op düşer.
 */

export type IpcMessage = {
  from: string;
  to: string;
  kind: string;
  payload: unknown;
  cap: string; // scoped capability token (opaque)
  at: number;
};

type Handler = (msg: IpcMessage) => void;

const listeners = new Map<string, Set<Handler>>();
const channel =
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("tedbirge-desktop-ipc")
    : null;

channel?.addEventListener("message", (event: MessageEvent<IpcMessage>) => {
  const msg = event.data;
  if (!msg || typeof msg !== "object") return;
  const set = listeners.get(msg.to);
  set?.forEach((h) => {
    try {
      h(msg);
    } catch {
      // izole hata — asla diğer dinleyicileri düşürmez.
    }
  });
});

export function postIpc(msg: Omit<IpcMessage, "at">): void {
  const full: IpcMessage = { ...msg, at: Date.now() };
  channel?.postMessage(full);
  // Aynı sekme dinleyicileri de tetiklenir.
  const set = listeners.get(msg.to);
  set?.forEach((h) => {
    try {
      h(full);
    } catch {
      /* izole */
    }
  });
}

export function onIpc(target: string, handler: Handler): () => void {
  const set = listeners.get(target) ?? new Set();
  set.add(handler);
  listeners.set(target, set);
  return () => set.delete(handler);
}
