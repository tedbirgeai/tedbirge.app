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

/** Yüzen dock için alt güvenli pay: dock 46 px + 8 px alt boşluk + pay. */
export const DOCK_CLEARANCE = 72;

/** Görünüm kipine göre simge kutusu ölçüleri. */
export function metrics(view: ViewMode) {
  return view === "buyuk"
    ? { w: 116, h: 124, glyph: 60, gap: 8 }
    : { w: 92, h: 104, glyph: 48, gap: 8 };
}

/**
 * Simgeleri ızgaraya dolan (auto-fill) düzenle yerleştirir.
 * ------------------------------------------------------------------
 * Kayıtlı (sürüklenmiş) konumların kapladığı hücreler korunur; kayıtsız
 * simgeler sütun sütun (yukarıdan aşağı) ilk BOŞ hücreye akar. Böylece
 * sürüklenen bir simgenin üzerine hiçbir simge binmez.
 *
 * @param keys   Yerleştirilecek simge anahtarları (sıralı).
 * @param saved  localStorage'dan gelen kayıtlı konumlar.
 * @param rows   Güvenli alana sığan satır sayısı.
 * @param top    Izgaranın başladığı üst pay (piksel).
 * @param cell   Simge kutusu ölçüleri (metrics çıktısı).
 * @param side   Yatay güvenli pay.
 */
export function flowIntoGrid(
  keys: string[],
  saved: Record<string, Point>,
  rows: number,
  top: number,
  cell: { w: number; h: number; gap: number },
  side = 16,
): Record<string, Point> {
  const cw = cell.w + cell.gap;
  const ch = cell.h + cell.gap;
  const occupied = new Set<string>();
  const result: Record<string, Point> = {};
  const wanted = new Set(keys);

  for (const [key, pos] of Object.entries(saved)) {
    if (!wanted.has(key)) continue;
    const col = Math.round((pos.x - side) / cw);
    const row = Math.round((pos.y - top) / ch);
    if (col < 0 || row < 0) continue; // ızgara dışı: yeniden akışa düşer
    occupied.add(`${col}:${row}`);
    result[key] = { x: side + col * cw, y: top + row * ch };
  }

  let cursor = 0;
  const cap = rows * 512; // taşma sigortası: sonsuz döngüyü engeller
  for (const key of keys) {
    if (result[key]) continue;
    let placed = false;
    while (cursor < cap) {
      const col = Math.floor(cursor / rows);
      const row = cursor % rows;
      cursor += 1;
      if (occupied.has(`${col}:${row}`)) continue;
      occupied.add(`${col}:${row}`);
      result[key] = { x: side + col * cw, y: top + row * ch };
      placed = true;
      break;
    }
    if (!placed) {
      // Izgara tükendi: kuyruk sağ tarafa dizilmeye devam eder.
      const col = Math.floor(cursor / rows);
      const row = cursor % rows;
      cursor += 1;
      result[key] = { x: side + col * cw, y: top + row * ch };
    }
  }
  return result;
}

/**
 * Kayıtlı konumu güvenli alan içine sıkıştırır.
 * Alt sınır dock payını içerir. Konum güvenli alanın tamamen dışındaysa
 * `null` döner; simge yeniden akışa düşer.
 */
export function clampToGrid(
  pos: Point,
  view: ViewMode,
  top: number,
  area: { w: number; h: number },
): Point | null {
  const m = metrics(view);
  const maxY = Math.max(top, area.h - DOCK_CLEARANCE - m.h);
  const maxX = Math.max(0, area.w - m.w);
  if (pos.x > area.w || pos.y > area.h) return null;
  return {
    x: Math.min(maxX, Math.max(0, pos.x)),
    y: Math.min(maxY, Math.max(top, pos.y)),
  };
}

/** Birden çok kayıtlı konumu tek seferde yazar (yeniden hizalama için). */
export function setPositions(next: Record<string, Point>) {
  state.positions = { ...next };
  persist();
  emit();
}

/** Serbest konumu en yakın ızgara hücresine oturtur. */
export function snap(pos: Point, view: ViewMode, top: number, bottom?: number, side = 16): Point {
  const m = metrics(view);
  const cw = m.w + m.gap;
  const ch = m.h + m.gap;
  // Akış ızgarası `side` pikselden başlar; snap aynı hücrelere oturur.
  const x = Math.max(0, side + Math.round((pos.x - side) / cw) * cw);
  let y = Math.max(top, Math.round((pos.y - top) / ch) * ch + top);
  if (typeof bottom === "number" && bottom > top) {
    const maxY = Math.max(top, Math.floor((bottom - DOCK_CLEARANCE - top - m.h) / ch) * ch + top);
    y = Math.min(y, maxY);
  }
  return { x, y };
}
