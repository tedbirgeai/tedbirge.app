/**
 * PENCERE YÖNETİCİSİ (WindowManager)
 * ------------------------------------------------------------------
 * Kabuk seviyesinde tekil bir mağaza: pencere konumu, boyutu, z-index
 * önceliği, küçültme/büyütme durumu. Yüzey (modal) yığınından ayrı bir
 * katmandır; mevcut davranışlar bozulmaz.
 *
 * Mobil (<768px) kabuk bu mağazayı okur ama tek pencereyi tam ekran
 * gösterir: sürükleme/boyutlandırma yalnız masaüstünde etkindir.
 */

import { useSyncExternalStore } from "react";

export type WindowRecord = {
  /** Örnek kimliği (aynı uygulamadan birden çok pencere açılabilir). */
  id: string;
  /** Kayıttaki uygulama kimliği: yerleşik panel ya da `web.*` hedefi. */
  appId: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  maximized: boolean;
  minimized: boolean;
};

type Listener = () => void;

const listeners = new Set<Listener>();
let windows: WindowRecord[] = [];
let zTop = 10;
let seq = 0;

function emit() {
  windows = [...windows];
  listeners.forEach((l) => l());
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function snapshot() {
  return windows;
}

const EMPTY: WindowRecord[] = [];

export function useWindows(): WindowRecord[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** Yeni pencere için kademeli (cascade) başlangıç konumu. */
function nextGeometry(index: number) {
  const vw = typeof window === "undefined" ? 1280 : window.innerWidth;
  const vh = typeof window === "undefined" ? 800 : window.innerHeight;
  const w = Math.min(980, Math.max(420, Math.round(vw * 0.62)));
  const h = Math.min(720, Math.max(340, Math.round(vh * 0.68)));
  const step = (index % 6) * 28;
  return {
    w,
    h,
    x: Math.max(8, Math.round((vw - w) / 2) + step - 60),
    y: Math.max(8, Math.round((vh - h) / 2) + step - 60),
  };
}

export function openWindow(appId: string, title: string): string {
  const existing = windows.find((w) => w.appId === appId);
  if (existing) {
    focusWindow(existing.id);
    if (existing.minimized) {
      windows = windows.map((w) => (w.id === existing.id ? { ...w, minimized: false } : w));
      emit();
    }
    return existing.id;
  }
  seq += 1;
  zTop += 1;
  const id = `${appId}#${seq}`;
  windows = [
    ...windows,
    { id, appId, title, z: zTop, maximized: false, minimized: false, ...nextGeometry(seq) },
  ];
  emit();
  return id;
}

export function closeWindow(id: string) {
  windows = windows.filter((w) => w.id !== id);
  emit();
}

export function focusWindow(id: string) {
  const target = windows.find((w) => w.id === id);
  if (!target || target.z === zTop) return;
  zTop += 1;
  windows = windows.map((w) => (w.id === id ? { ...w, z: zTop } : w));
  emit();
}

export function moveWindow(id: string, x: number, y: number) {
  windows = windows.map((w) => (w.id === id ? { ...w, x: Math.max(0, x), y: Math.max(0, y) } : w));
  emit();
}

export function resizeWindow(id: string, w: number, h: number) {
  windows = windows.map((win) =>
    win.id === id ? { ...win, w: Math.max(320, w), h: Math.max(220, h) } : win,
  );
  emit();
}

export function toggleMaximize(id: string) {
  windows = windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w));
  emit();
  focusWindow(id);
}

export function minimizeWindow(id: string) {
  windows = windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
  emit();
}

export function restoreWindow(id: string) {
  windows = windows.map((w) => (w.id === id ? { ...w, minimized: false } : w));
  emit();
  focusWindow(id);
}

export function closeAllWindows() {
  windows = [];
  emit();
}
