/**
 * MASAÜSTÜ YERLEŞİM DEPOSU
 * ------------------------------------------------------------------
 * Simge konumları (serbest sürükleme + ızgaraya oturtma), sıralama ve
 * görünüm tercihi ile kilitli belge listesi burada tutulur. Tümü cihaz
 * yerel ayarlarındadır; hiçbir bilgi dışarı gönderilmez.
 */

import { useSyncExternalStore } from "react";

export type SortMode = "ad" | "tur" | "tarih";
export type ViewMode = "buyuk" | "orta";

export type Point = { x: number; y: number };

export type DesktopLayout = {
  /** Simge anahtarı → serbest konum (piksel). */
  positions: Record<string, Point>;
  sort: SortMode;
  view: ViewMode;
  /** Kilitlenen VFS kayıtlarının kimlikleri. */
  locked: string[];
};

const KEY = "tbos.desktop.layout";

const EMPTY: DesktopLayout = { positions: {}, sort: "tur", view: "orta", locked: [] };

let state: DesktopLayout = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* depolama kapalı olabilir */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DesktopLayout>;
      state = {
        positions: parsed.positions ?? {},
        sort: parsed.sort ?? "tur",
        view: parsed.view ?? "orta",
        locked: parsed.locked ?? [],
      };
    }
  } catch {
    state = EMPTY;
  }
  emit();
}

function subscribe(l: () => void) {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDesktopLayout(): DesktopLayout {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
}

export function setPosition(key: string, pos: Point) {
  state.positions = { ...state.positions, [key]: pos };
  persist();
  emit();
}

/** Serbest konumları temizler: simgeler yeniden ızgaraya dizilir. */
export function alignToGrid() {
  state.positions = {};
  persist();
  emit();
}

export function setSort(sort: SortMode) {
  state.sort = sort;
  persist();
  emit();
}

export function setView(view: ViewMode) {
  state.view = view;
  persist();
  emit();
}

export function isLocked(id: string): boolean {
  return state.locked.includes(id);
}

export function toggleLock(id: string): boolean {
  const next = state.locked.includes(id)
    ? state.locked.filter((x) => x !== id)
    : [...state.locked, id];
  state.locked = next;
  persist();
  emit();
  return next.includes(id);
}

/** Görünüm kipine göre simge kutusu ölçüleri. */
export function metrics(view: ViewMode) {
  return view === "buyuk"
    ? { w: 116, h: 124, glyph: 60, gap: 8 }
    : { w: 92, h: 104, glyph: 48, gap: 8 };
}

/** Serbest konumu en yakın ızgara hücresine oturtur. */
export function snap(pos: Point, view: ViewMode, top: number): Point {
  const m = metrics(view);
  const cw = m.w + m.gap;
  const ch = m.h + m.gap;
  const x = Math.max(0, Math.round(pos.x / cw) * cw);
  const y = Math.max(top, Math.round((pos.y - top) / ch) * ch + top);
  return { x, y };
}
