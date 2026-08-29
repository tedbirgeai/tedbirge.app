/**
 * YEREL EŞ TAKMA ADI
 * ------------------------------------------------------------------
 * Ağda beliren adsız cihazlara kullanıcının kendi verdiği ad. Yalnız bu
 * cihazda saklanır, hiçbir yere gönderilmez.
 *
 * Kalıcılık: kayıt IndexedDB'de (kalıcı depolama izni kapsamında) tutulur;
 * eski localStorage kaydı açılışta bir kez içeri göç ettirilir. Senkron
 * okuyucular için bellek önbelleği korunur. SSR güvenli: window yoksa boş.
 */

import { getPref, putPref } from "@/lib/store/idb";

const STORE_KEY = "tedbirge.peer.nickname";

let cache: Record<string, string> = {};
let hydrated = false;
let hydrating: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function readLegacy(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** Kalıcı kayıttan yükler; eski localStorage verisini bir kez taşır. */
export function hydrateNicknames(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (hydrating) return hydrating;
  hydrating = (async () => {
    const stored = await getPref<Record<string, string>>(STORE_KEY, {});
    const legacy = readLegacy();
    const merged = { ...legacy, ...stored };
    cache = merged;
    hydrated = true;
    if (Object.keys(legacy).length && Object.keys(stored).length === 0) {
      await putPref(STORE_KEY, merged);
      try {
        window.localStorage.removeItem(STORE_KEY);
      } catch {
        /* gizli mod */
      }
    }
    notify();
  })();
  return hydrating;
}

function persist(map: Record<string, string>) {
  void putPref(STORE_KEY, map);
  notify();
}

export function onNickname(cb: () => void): () => void {
  // İlk dinleyici geldiğinde kalıcı kayıt yüklenir.
  if (!hydrated) void hydrateNicknames();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getNickname(nodeId: string): string {
  if (!nodeId) return "";
  if (!hydrated) void hydrateNicknames();
  return cache[nodeId] ?? "";
}

export function setNickname(nodeId: string, name: string): void {
  if (!nodeId || typeof window === "undefined") return;
  const clean = name.trim().slice(0, 48);
  const map = { ...cache };
  if (clean) map[nodeId] = clean;
  else delete map[nodeId];
  cache = map;
  persist(map);
}

export function clearNickname(nodeId: string): void {
  setNickname(nodeId, "");
}
