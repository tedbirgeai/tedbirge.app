/**
 * TEDBİRGE® WEBOS — ÇALIŞMA ZAMANI HATA BİLDİRİMİ
 * ------------------------------------------------------------------
 * Yakalanan hatalar sessizce yutulmaz; barındırma ortamının hata
 * kanalına iletilir. Aşağıdaki `window` alanları barındırma
 * platformunun sözleşmesidir; adları değiştirilemez, yalnız önizleme
 * ortamında tanımlıdır ve üretimde sessizce yok sayılır.
 */

type RuntimeErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type HostErrorChannel = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: RuntimeErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __lovableEvents?: HostErrorChannel;
    __lovableReportRuntimeError?: (payload: {
      message: string;
      stack?: string;
      filename?: string;
    }) => void;
  }
}

/** Cihazda tutulan son hata kayıtları (Sistem Bilgisi > Kayıtlar). */
export type RuntimeLogEntry = { at: string; message: string; where?: string };

const LOG_KEY = "tedbirge.runtime.log";
const LOG_LIMIT = 50;

export function readRuntimeLog(): RuntimeLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    const parsed = raw ? (JSON.parse(raw) as RuntimeLogEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearRuntimeLog() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LOG_KEY);
  } catch {
    /* depolama kapalıysa sessizce geçilir */
  }
}

function appendRuntimeLog(entry: RuntimeLogEntry) {
  if (typeof window === "undefined") return;
  try {
    const next = [entry, ...readRuntimeLog()].slice(0, LOG_LIMIT);
    window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  } catch {
    /* depolama dolu veya kapalıysa kayıt atlanır */
  }
}

export function reportRuntimeError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.__lovableEvents?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
  // Üretim React'i sınır (boundary) hatalarını window.onerror'a yeniden
  // fırlatmaz; bu yüzden ortamın bildirim kancasına elle iletilir.
  // Loader ve sunucu fonksiyonları çoğu kez ham Response fırlatır;
  // String(it) "[object Response]" verdiği için durum ve adres okunur.
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  window.__lovableReportRuntimeError?.({
    message,
    stack: error instanceof Error ? error.stack : undefined,
    filename: window.location.pathname,
  });
  appendRuntimeLog({
    at: new Date().toISOString(),
    message,
    where: window.location.pathname,
  });
}
