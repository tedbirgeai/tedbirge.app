/**
 * PAYLAŞIMLI TELEMETRİ DEPOSU
 * ------------------------------------------------------------------
 * Saat, çalışma süresi ve bellek ölçümü tek bir 1000 ms zamanlayıcıdan
 * okunur. Bileşenler kendi seçicilerine abone olur; değer değişmediyse
 * anlık görüntü (snapshot) referansı korunur, böylece gereksiz yeniden
 * render ve mikro titreşim oluşmaz.
 */

import { useSyncExternalStore } from "react";

export type Telemetry = {
  /** "14:05 · 01 Eyl" biçiminde saat + tarih. */
  clock: string;
  /** Sekmenin açık olduğu saniye. */
  uptimeSec: number;
  /** Kullanılan JS yığını (MB); tarayıcı desteklemiyorsa null. */
  memMb: number | null;
};

type MemoryInfo = { usedJSHeapSize: number; jsHeapSizeLimit: number };

const EMPTY: Telemetry = { clock: "", uptimeSec: 0, memMb: null };

let snapshot: Telemetry = EMPTY;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function readClock(): string {
  const now = new Date();
  return (
    now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    now.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })
  );
}

function readMemory(): number | null {
  if (typeof performance === "undefined") return null;
  const perf = performance as Performance & { memory?: MemoryInfo };
  const m = perf.memory;
  if (!m || !m.jsHeapSizeLimit) return null;
  // Tam sayıya yuvarlanır: ondalık oynamaları metin genişliğini titretiyordu.
  return Math.round(m.usedJSHeapSize / 1024 / 1024);
}

function tick() {
  const next: Telemetry = {
    clock: readClock(),
    uptimeSec: typeof performance === "undefined" ? 0 : Math.round(performance.now() / 1000),
    memMb: readMemory(),
  };
  const prev = snapshot;
  if (prev.clock === next.clock && prev.uptimeSec === next.uptimeSec && prev.memMb === next.memMb) {
    return;
  }
  snapshot = next;
  for (const fn of listeners) fn();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  if (!timer && typeof window !== "undefined") {
    tick();
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => EMPTY;

/** Tüm telemetri alanları (nadiren gerekir; tercihen tekil seçicileri kullanın). */
export function useTelemetry(): Telemetry {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useClock(): string {
  return useSyncExternalStore(subscribe, () => snapshot.clock, () => EMPTY.clock);
}

export function useMemoryMb(): number | null {
  return useSyncExternalStore(subscribe, () => snapshot.memMb, () => EMPTY.memMb);
}

export function useUptimeSec(): number {
  return useSyncExternalStore(subscribe, () => snapshot.uptimeSec, () => EMPTY.uptimeSec);
}

/** Saniyeyi "01:02:03" biçiminde sabit genişlikli metne çevirir. */
export function formatUptime(sec: number): string {
  const hh = Math.floor(sec / 3600);
  const mm = Math.floor((sec % 3600) / 60);
  const ss = sec % 60;
  return [hh, mm, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

/**
 * Kaba taneli paylaşımlı tetikleyici: `everySec` saniyede bir değişen
 * tamsayı döner. Bileşenler kendi `setInterval`'ini kurmaz; tek
 * zamanlayıcıdan beslenir, ara saniyelerde yeniden render olmaz.
 */
export function useTick(everySec: number): number {
  const step = Math.max(1, Math.round(everySec));
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(snapshot.uptimeSec / step),
    () => 0,
  );
}
