/**
 * AĞ MODLARI
 * ------------------------------------------------------------------
 * Kullanıcı sistemin dış dünyaya nasıl bağlanacağını tek yerden seçer.
 * Seçim `localStorage`'da kalıcıdır ve düğüm çalışma zamanına uygulanır:
 *
 *  - global   : bulut sinyalleşmesi + yerel keşif birlikte
 *  - mesh     : yalnız aynı Wi-Fi / yerel ağdaki cihazlarla eşleşme
 *  - cellular : hücresel veri köprüsü (mobil bağlantı üzerinden taşıma)
 *  - offgrid  : tam gizlilik — düğüm durur, hiçbir dış bağlantı kurulmaz
 */

import { useSyncExternalStore } from "react";

export type NetworkModeId = "global" | "mesh" | "cellular" | "offgrid";

export type NetworkMode = {
  id: NetworkModeId;
  label: string;
  hint: string;
};

export const NETWORK_MODES: ReadonlyArray<NetworkMode> = [
  { id: "global", label: "Küresel İnternet", hint: "Bulut buluşma + yerel keşif birlikte" },
  { id: "mesh", label: "Yerel Wi-Fi Mesh", hint: "Yalnız aynı ağdaki cihazlar (Daelog P2P)" },
  { id: "cellular", label: "Hücresel Veri Köprüsü", hint: "Mobil bağlantı üzerinden taşıma" },
  { id: "offgrid", label: "Tam Gizlilik (Off-Grid)", hint: "Dış bağlantı yok, cihaz yalıtılır" },
];

const KEY = "tedbirge.network.mode";

let mode: NetworkModeId = "global";
let hydrated = false;
const listeners = new Set<() => void>();

function isMode(v: string | null): v is NetworkModeId {
  return v === "global" || v === "mesh" || v === "cellular" || v === "offgrid";
}

function emit() {
  listeners.forEach((l) => l());
}

function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["network"] = mode;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(KEY);
    if (isMode(stored)) mode = stored;
  } catch {
    /* depolama kapalı olabilir */
  }
  apply();
  emit();
}

export function getNetworkMode(): NetworkModeId {
  return mode;
}

/** Off-Grid seçiliyken hiçbir dış taşıma denemesi yapılmaz. */
export function isOffGrid(): boolean {
  return mode === "offgrid";
}

export function setNetworkMode(next: NetworkModeId) {
  if (mode === next) return;
  mode = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* yoksay */
  }
  apply();
  emit();

  // Çalışma zamanına uygula: Off-Grid düğümü tamamen durdurur,
  // diğer modlar düğümü açık tutup keşfi tazeler.
  void import("@/lib/node-runtime").then((m) => {
    if (next === "offgrid") {
      m.stopNode();
      return;
    }
    void m.startNode().then(() => m.pingNodePeers());
  });
}

export function useNetworkMode(): NetworkModeId {
  return useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => mode,
    () => "global" as NetworkModeId,
  );
}
