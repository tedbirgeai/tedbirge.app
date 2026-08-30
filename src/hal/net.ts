/**
 * HAL — AĞ SOYUTLAMASI
 * ------------------------------------------------------------------
 * Kabuk ve uygulamalar, taşıyıcıyı bilmeden mesaj gönderir. Tarayıcı
 * kolunda taşıyıcı WebRTC/BroadcastChannel çekirdeğidir (`Kernel`
 * sözleşmesi); native kolda aynı arayüz doğrudan soket/radyo sürücüsü
 * üzerine uygulanır.
 */

import { kernel, type KernelStatus } from "@/kernel/contract";
import type { EnvelopeKind } from "@/lib/mesh-envelope";
import type { Priority } from "@/lib/store/idb";

export interface NetHal {
  send: (
    kind: EnvelopeKind,
    to: string | "*",
    payload: unknown,
    priority?: Priority,
  ) => Promise<boolean>;
  subscribe: (kind: EnvelopeKind, fn: (from: string, body: unknown) => void) => () => void;
  /** Ulaşılabilir eş kimlikleri. */
  peers: () => string[];
  status: () => KernelStatus;
}

/** Tarayıcı uygulaması — kayıtlı çekirdeği (TS veya Wasm) sarar. */
export const webNetHal: NetHal = {
  send: (kind, to, payload, priority) => kernel().send(kind, to, payload, priority),
  subscribe: (kind, fn) => kernel().subscribe(kind, fn),
  peers: () => kernel().resolve(),
  status: () => kernel().status(),
};
