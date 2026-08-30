/**
 * ÇEVRİMDIŞI DURUMU
 * ------------------------------------------------------------------
 * Tarayıcının ağ durumunu tek bir abonelik üzerinden yayınlar. Sunucu
 * tarafında her zaman "çevrimiçi" varsayılır (hidrasyon uyumsuzluğu yok).
 */

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Cihaz şu anda ağa bağlı mı? */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}
