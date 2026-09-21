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

import { announce } from "@/lib/shell/announce";
import { pushUndo } from "@/lib/shell/undo-stack";

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
let viewportOverride: { width: number; height: number } | null = null;

const Z_BASE = 20;
const Z_STEP = 2;
const SAFE_MARGIN = 10;
const DOCK_CLEARANCE = 82;
const CASCADE_STEP = 30;

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

function viewport() {
  if (viewportOverride) return viewportOverride;
  if (typeof window === "undefined") return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function safeBounds() {
  const { width, height } = viewport();
  const mobile = width < 768;
  const bottom = mobile ? SAFE_MARGIN : DOCK_CLEARANCE;
  return {
    left: mobile ? 0 : SAFE_MARGIN,
    top: mobile ? 0 : SAFE_MARGIN,
    width: Math.max(320, width - (mobile ? 0 : SAFE_MARGIN * 2)),
    height: Math.max(260, height - (mobile ? 0 : SAFE_MARGIN + bottom)),
  };
}

function preferredSize() {
  const bounds = safeBounds();
  if (bounds.width < 768) return { w: bounds.width, h: bounds.height };
  return {
    w: Math.min(980, Math.max(520, Math.round(bounds.width * 0.62))),
    h: Math.min(720, Math.max(380, Math.round(bounds.height * 0.72))),
  };
}

function clampBox(box: { x: number; y: number; w: number; h: number }) {
  const bounds = safeBounds();
  const w = Math.min(Math.max(320, Math.round(box.w)), bounds.width);
  const h = Math.min(Math.max(220, Math.round(box.h)), bounds.height);
  const maxX = bounds.left + Math.max(0, bounds.width - w);
  const maxY = bounds.top + Math.max(0, bounds.height - h);
  return {
    w,
    h,
    x: Math.min(maxX, Math.max(bounds.left, Math.round(box.x))),
    y: Math.min(maxY, Math.max(bounds.top, Math.round(box.y))),
  };
}

function overlapArea(a: { x: number; y: number; w: number; h: number }, b: WindowRecord) {
  if (b.minimized) return 0;
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function normalizeZ(topId?: string) {
  const ordered = windows.filter((w) => !w.minimized && w.id !== topId).sort((a, b) => a.z - b.z);
  const target = topId ? windows.find((w) => w.id === topId && !w.minimized) : undefined;
  let next = Z_BASE;
  const z = new Map<string, number>();
  for (const win of ordered) {
    z.set(win.id, next);
    next += Z_STEP;
  }
  if (target) {
    z.set(target.id, next);
    next += Z_STEP;
  }
  windows = windows.map((win) => ({
    ...win,
    z: win.minimized ? Z_BASE - Z_STEP : (z.get(win.id) ?? win.z),
  }));
  zTop = Math.max(Z_BASE, next - Z_STEP);
}

/** Yeni pencere için kademeli (cascade) başlangıç konumu. */
function nextGeometry(index: number) {
  const bounds = safeBounds();
  const { w, h } = preferredSize();
  const center = clampBox({
    w,
    h,
    x: bounds.left + Math.round((bounds.width - w) / 2),
    y: bounds.top + Math.round((bounds.height - h) / 2),
  });
  const candidates = [center];
  const steps = Math.max(8, Math.min(18, Math.floor((bounds.width + bounds.height) / 150)));
  for (let i = 0; i < steps; i += 1) {
    const step = ((index + i) % steps) * CASCADE_STEP;
    candidates.push(
      clampBox({
        w,
        h,
        x: bounds.left + SAFE_MARGIN + step,
        y: bounds.top + SAFE_MARGIN + step,
      }),
    );
  }
  const columns = Math.max(1, Math.floor(bounds.width / Math.max(360, Math.round(w * 0.55))));
  const rows = Math.max(1, Math.floor(bounds.height / Math.max(260, Math.round(h * 0.55))));
  const cellW = Math.max(1, (bounds.width - w) / Math.max(1, columns - 1));
  const cellH = Math.max(1, (bounds.height - h) / Math.max(1, rows - 1));
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      candidates.push(
        clampBox({
          w,
          h,
          x: bounds.left + col * cellW,
          y: bounds.top + row * cellH,
        }),
      );
    }
  }
  let best = candidates[0] ?? center;
  let bestOverlap = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const area = windows.reduce((sum, win) => sum + overlapArea(candidate, win), 0);
    if (area < bestOverlap) {
      best = candidate;
      bestOverlap = area;
      if (area === 0) break;
    }
  }
  return best;
}

export function openWindow(appId: string, title: string, fresh = false): string {
  const existing = fresh ? undefined : windows.find((w) => w.appId === appId);
  if (existing) {
    windows = windows.map((w) => (w.id === existing.id ? { ...w, minimized: false } : w));
    normalizeZ(existing.id);
    emit();
    return existing.id;
  }
  seq += 1;
  const id = `${appId}#${seq}`;
  windows = [
    ...windows,
    {
      id,
      appId,
      title,
      z: zTop + Z_STEP,
      maximized: false,
      minimized: false,
      ...nextGeometry(seq),
    },
  ];
  normalizeZ(id);
  emit();
  announce(`${title} açıldı`);
  return id;
}

export function closeWindow(id: string) {
  const closed = windows.find((w) => w.id === id);
  windows = windows.filter((w) => w.id !== id);
  normalizeZ(activeWindow()?.id);
  emit();
  if (closed) {
    // Nielsen #3: kapatma geri alınabilir (Ctrl + Z).
    pushUndo({ label: `${closed.title} kapatıldı`, undo: () => reopenWindow(closed) });
    announce(`${closed.title} kapatıldı`);
  }
}

export function focusWindow(id: string) {
  const target = windows.find((w) => w.id === id);
  if (!target || target.minimized || target.z === zTop) return;
  normalizeZ(id);
  emit();
}

export function moveWindow(id: string, x: number, y: number) {
  windows = windows.map((w) => (w.id === id ? { ...w, ...clampBox({ ...w, x, y }) } : w));
  emit();
}

export function resizeWindow(id: string, w: number, h: number) {
  windows = windows.map((win) => (win.id === id ? { ...win, ...clampBox({ ...win, w, h }) } : win));
  emit();
}

/** Kenar/köşe tutamakları: konum ve boyut birlikte güncellenir. */
export function setWindowBox(id: string, x: number, y: number, w: number, h: number) {
  windows = windows.map((win) => {
    if (win.id !== id) return win;
    const nw = Math.max(320, w);
    const nh = Math.max(220, h);
    return { ...win, ...clampBox({ x: x - (nw - w), y: y - (nh - h), w: nw, h: nh }) };
  });
  emit();
}

export function toggleMaximize(id: string) {
  windows = windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w));
  normalizeZ(id);
  emit();
}

export function minimizeWindow(id: string) {
  windows = windows.map((w) => (w.id === id ? { ...w, minimized: true } : w));
  normalizeZ(activeWindow()?.id);
  emit();
}

export function restoreWindow(id: string) {
  windows = windows.map((w) => (w.id === id ? { ...w, minimized: false } : w));
  normalizeZ(id);
  emit();
}

export function closeAllWindows() {
  windows = [];
  zTop = Z_BASE;
  emit();
}

/** Pencereyi doğrudan verilen kutuya yerleştirir (kenara yapışma için). */
export function placeWindow(id: string, x: number, y: number, w: number, h: number) {
  windows = windows.map((win) =>
    win.id === id
      ? {
          ...win,
          maximized: false,
          ...clampBox({ x, y, w, h }),
        }
      : win,
  );
  normalizeZ(id);
  emit();
}

/** Tüm pencerelerin anlık listesi (React dışı okumalar için). */
export function getWindows(): WindowRecord[] {
  return windows;
}

/** Odaklanmış (en üstteki, küçültülmemiş) pencere. */
export function activeWindow(): WindowRecord | null {
  const visible = windows.filter((w) => !w.minimized);
  if (!visible.length) return null;
  return visible.reduce((a, b) => (a.z > b.z ? a : b));
}

/**
 * Kapatılan pencereyi aynı kimlik ve geometriyle geri getirir.
 * Geri alma yığını (Ctrl + Z) tarafından kullanılır.
 */
export function reopenWindow(rec: WindowRecord) {
  if (windows.some((w) => w.id === rec.id)) return;
  windows = [...windows, { ...rec, z: zTop + Z_STEP, minimized: false }];
  normalizeZ(rec.id);
  emit();
}

/** Tüm pencereleri küçültür; geri getirmek için önceki durum döner. */
export function minimizeAll(): string[] {
  const ids = windows.filter((w) => !w.minimized).map((w) => w.id);
  if (!ids.length) return [];
  windows = windows.map((w) => (w.minimized ? w : { ...w, minimized: true }));
  emit();
  return ids;
}

/** Verilen pencereleri yeniden görünür yapar. */
export function restoreMany(ids: string[]) {
  if (!ids.length) return;
  const set = new Set(ids);
  windows = windows.map((w) => (set.has(w.id) ? { ...w, minimized: false } : w));
  let last: string | undefined;
  for (let i = ids.length - 1; i >= 0; i -= 1) {
    const id = ids[i];
    if (id && windows.some((w) => w.id === id)) {
      last = id;
      break;
    }
  }
  normalizeZ(last);
  emit();
}

/** Testlerde deterministik ölçü kullanılır; üretimde gerçek viewport okunur. */
export function setWindowViewportForTest(size: { width: number; height: number } | null) {
  viewportOverride = size;
}

/** Testler için mağazayı temiz başlangıca alır. */
export function resetWindowManagerForTest() {
  windows = [];
  zTop = Z_BASE;
  seq = 0;
  viewportOverride = null;
  emit();
}
