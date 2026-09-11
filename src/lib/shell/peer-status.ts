/**
 * EŞ (PEER) DURUM DEPOSU
 * ------------------------------------------------------------------
 * P2P ağ sinyalleri kabuk kökünde state güncellediğinde masaüstü ve
 * tüm pencereler birlikte yeniden çiziliyordu. Bu depo ağ akışını
 * kabuktan ayırır: yalnız üst bardaki gösterge ve durum panelleri
 * abone olur.
 *
 * İki koruma vardır:
 *  1. Sönümleme (trailing debounce, 1500 ms): anlık dalgalanmalar
 *     arayüzü tetiklemez; ilk değer beklemeden yayınlanır.
 *  2. Eşitlik kontrolü: metin/sayı değişmediyse yeni anlık görüntü
 *     yayınlanmaz, bileşen yeniden render olmaz.
 */

import { useSyncExternalStore } from "react";

import { describeNode, getNodeSnapshot, subscribeNode } from "@/lib/node-runtime";

export type PeerStatus = {
  /** İnsan okunur ağ durumu metni. */
  text: string;
  tone: "off" | "linked" | "online" | "offline";
  /** Doğrudan bağlı cihaz sayısı. */
  peers: number;
  /** Sırada bekleyen gönderim sayısı. */
  queued: number;
  /** Son ölçülen gidiş-dönüş gecikmesi (ms). */
  rttMs: number | null;
};

/** Sinyal dalgalanmalarının sönümlendiği süre. */
export const PEER_DEBOUNCE_MS = 1500;

const EMPTY: PeerStatus = { text: "Ağ Kapalı", tone: "off", peers: 0, queued: 0, rttMs: null };

let snapshot: PeerStatus = EMPTY;
let unsubscribe: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastPublishedAt = 0;

const listeners = new Set<() => void>();

export function samePeerStatus(a: PeerStatus, b: PeerStatus): boolean {
  return (
    a.text === b.text &&
    a.tone === b.tone &&
    a.peers === b.peers &&
    a.queued === b.queued &&
    a.rttMs === b.rttMs
  );
}

export function readPeerStatus(): PeerStatus {
  const s = getNodeSnapshot();
  const d = describeNode(s);
  return { text: d.text, tone: d.tone, peers: d.directPeers, queued: d.queued, rttMs: s.rttMs };
}

function commit(next: PeerStatus) {
  if (samePeerStatus(snapshot, next)) return;
  snapshot = next;
  lastPublishedAt = Date.now();
  for (const fn of listeners) fn();
}

/** Düğümden gelen her sinyalde çağrılır; ilk değer anında, sonrakiler sönümlü. */
function onNodeSignal() {
  const next = readPeerStatus();
  if (samePeerStatus(snapshot, next)) return;
  const elapsed = Date.now() - lastPublishedAt;
  if (elapsed >= PEER_DEBOUNCE_MS) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    commit(next);
    return;
  }
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    commit(readPeerStatus());
  }, PEER_DEBOUNCE_MS - elapsed);
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  if (!unsubscribe) {
    snapshot = readPeerStatus();
    lastPublishedAt = Date.now();
    unsubscribe = subscribeNode(onNodeSignal);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      unsubscribe?.();
      unsubscribe = null;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

export function usePeerStatus(): PeerStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Yalnız tek alana abone olmak isteyen bileşenler için (ör. cihaz sayısı). */
export function usePeerCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => snapshot.peers,
    () => 0,
  );
}

/** Testler için: depo durumunu sıfırlar. */
export function resetPeerStatusForTests() {
  snapshot = EMPTY;
  lastPublishedAt = 0;
  if (timer) clearTimeout(timer);
  timer = null;
  unsubscribe?.();
  unsubscribe = null;
  listeners.clear();
}
