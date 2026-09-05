/**
 * ÇALIŞMA ZAMANI KORUMASI
 * ------------------------------------------------------------------
 * Açılışta çalışan motorlar (Wasm çekirdek yükleyici, düğüm çalışma
 * zamanı, çevrimdışı destek, medya/WebRTC ısıtması) hiçbir koşulda ilk
 * çizimi düşürmez. Her başlatma burada sarmalanır: senkron fırlatma da,
 * reddedilen söz de yakalanır ve cihazdaki hata günlüğüne yazılır.
 */

import { reportRuntimeError } from "@/lib/error-reporting";

/** Bir başlatma çağrısını güvenli biçimde çalıştırır; asla fırlatmaz. */
export function safeBoot(label: string, run: () => unknown): void {
  try {
    const result = run();
    if (result && typeof (result as Promise<unknown>).catch === "function") {
      void (result as Promise<unknown>).catch((error: unknown) => {
        reportRuntimeError(error, { boundary: "boot", service: label });
      });
    }
  } catch (error) {
    reportRuntimeError(error, { boundary: "boot", service: label });
  }
}

let installed = false;

/**
 * Yakalanmamış hataları ve reddedilen sözleri günlüğe alır.
 * Sayfa çalışmaya devam eder; kullanıcı boş ekran görmez.
 */
export function installGlobalRuntimeGuards(): () => void {
  if (typeof window === "undefined" || installed) return () => {};
  installed = true;

  const onRejection = (event: PromiseRejectionEvent) => {
    reportRuntimeError(event.reason, { boundary: "unhandledrejection" });
  };
  const onError = (event: ErrorEvent) => {
    reportRuntimeError(event.error ?? event.message, { boundary: "window_error" });
  };

  window.addEventListener("unhandledrejection", onRejection);
  window.addEventListener("error", onError);

  return () => {
    window.removeEventListener("unhandledrejection", onRejection);
    window.removeEventListener("error", onError);
    installed = false;
  };
}

/** Tarayıcı yeteneklerinin varlığı — eksikse ilgili motor sessizce kapanır. */
export const capabilities = {
  get webrtc() {
    return typeof window !== "undefined" && typeof window.RTCPeerConnection === "function";
  },
  get media() {
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  },
  get wasm() {
    return typeof WebAssembly !== "undefined";
  },
  get sharedMemory() {
    return typeof SharedArrayBuffer !== "undefined" && globalThis.crossOriginIsolated === true;
  },
  get storage() {
    return typeof indexedDB !== "undefined";
  },
};
