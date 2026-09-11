/**
 * DOCK SABİTLENMİŞ UYGULAMALAR
 * ------------------------------------------------------------------
 * Yüzen cam dock'taki sabit uygulama listesi. Kullanıcı hem parmakla
 * hem fareyle sürükleyerek sıralamayı değiştirir, masaüstünden veya
 * mağazadan simge sürükleyip sabitler. Seçim cihazda (localStorage)
 * kalıcıdır; SSR'de varsayılana düşer.
 *
 * v2: liste sabit üç yuva değil, genişleyebilen bir sıradır. Eski
 * `setDockSlot` / `swapDockSlots` çağrıları aynı şekilde çalışır.
 */

import { useSyncExternalStore } from "react";

export const DOCK_SLOTS_KEY = "tbos.dock.slots";
/** Dock'ta en fazla tutulabilecek sabit uygulama sayısı. */
export const MAX_PINS = 10;
/** Geriye dönük ad: varsayılan sabit uygulama sayısı. */
export const SLOT_COUNT = 3;

/** Varsayılan sabitler: Sohbet · Arama · WhatsApp. */
export const DEFAULT_SLOTS: string[] = ["messenger", "calls", "web.wa"];

let slots: string[] = DEFAULT_SLOTS;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  slots = [...slots];
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(DOCK_SLOTS_KEY, JSON.stringify(slots));
  } catch {
    /* depolama kapalı olabilir */
  }
}

function normalize(list: unknown): string[] {
  const arr = Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  // Yinelenenler ayıklanır, üst sınır uygulanır, liste hiç boş kalmaz.
  const out = Array.from(new Set(arr)).slice(0, MAX_PINS);
  return out.length ? out : [...DEFAULT_SLOTS];
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(DOCK_SLOTS_KEY);
    slots = raw ? normalize(JSON.parse(raw)) : [...DEFAULT_SLOTS];
  } catch {
    slots = [...DEFAULT_SLOTS];
  }
  emit();
}

export function useDockSlots(): string[] {
  return useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => slots,
    () => DEFAULT_SLOTS,
  );
}

/** Anlık liste (React dışı okumalar için). */
export function dockPins(): string[] {
  return slots;
}

export function isPinned(appId: string): boolean {
  return slots.includes(appId);
}

/** Uygulamayı dock'a sabitler (varsa yeniden eklenmez). */
export function pinApp(appId: string, index?: number): boolean {
  if (!appId || slots.includes(appId)) return false;
  if (slots.length >= MAX_PINS) return false;
  const next = [...slots];
  if (index == null || index < 0 || index > next.length) next.push(appId);
  else next.splice(index, 0, appId);
  slots = normalize(next);
  persist();
  emit();
  return true;
}

/** Sabitlemeyi kaldırır; son sabit uygulama silinmez. */
export function unpinApp(appId: string): boolean {
  if (!slots.includes(appId) || slots.length <= 1) return false;
  slots = slots.filter((x) => x !== appId);
  persist();
  emit();
  return true;
}

/** Sürükle-bırak ile yeniden sıralama: kaynak öğe hedef konuma taşınır. */
export function movePin(from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= slots.length || to >= slots.length) return;
  const next = [...slots];
  const [item] = next.splice(from, 1);
  if (!item) return;
  next.splice(to, 0, item);
  slots = normalize(next);
  persist();
  emit();
}

/** Yuvaya uygulama yerleştirir (eski API): varsa taşır, yoksa ekler. */
export function setDockSlot(index: number, appId: string) {
  if (index < 0 || !appId) return;
  const existing = slots.indexOf(appId);
  if (existing >= 0) {
    movePin(existing, Math.min(index, slots.length - 1));
    return;
  }
  pinApp(appId, index);
}

/** İki sabiti takas eder (eski API). */
export function swapDockSlots(a: number, b: number) {
  if (a === b || a < 0 || b < 0 || a >= slots.length || b >= slots.length) return;
  const next = [...slots];
  const tmp = next[a] as string;
  next[a] = next[b] as string;
  next[b] = tmp;
  slots = normalize(next);
  persist();
  emit();
}

export function resetDockSlots() {
  slots = [...DEFAULT_SLOTS];
  persist();
  emit();
}
