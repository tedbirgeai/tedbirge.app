/**
 * YEREL EŞ TAKMA ADI
 * ------------------------------------------------------------------
 * Ağda beliren adsız cihazlara kullanıcının kendi verdiği ad. Yalnız bu
 * cihazda (localStorage) saklanır, hiçbir yere gönderilmez. SSR güvenli:
 * window yoksa boş sözlük döner.
 */

const STORE_KEY = "tedbirge.peer.nickname";

let cache: Record<string, string> | null = null;
const listeners = new Set<() => void>();

function all(): Record<string, string> {
  if (typeof window === "undefined") return {};
  if (!cache) {
    try {
      cache = JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}") as Record<string, string>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

function persist(map: Record<string, string>) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* gizli mod */
  }
  listeners.forEach((l) => l());
}

export function onNickname(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getNickname(nodeId: string): string {
  if (!nodeId) return "";
  return all()[nodeId] ?? "";
}

export function setNickname(nodeId: string, name: string): void {
  if (!nodeId || typeof window === "undefined") return;
  const clean = name.trim().slice(0, 48);
  const map = { ...all() };
  if (clean) map[nodeId] = clean;
  else delete map[nodeId];
  cache = map;
  persist(map);
}

export function clearNickname(nodeId: string): void {
  setNickname(nodeId, "");
}
