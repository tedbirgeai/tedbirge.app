/**
 * DOCK SABİT SLOTLARI
 * ------------------------------------------------------------------
 * Anasayfa düğmesinin yanındaki üç sabit uygulama yuvası. Kullanıcı bu
 * yuvaları hem parmakla hem fareyle sürükleyerek değiştirir; seçim
 * cihazda (localStorage) kalıcıdır. SSR'de varsayılana düşer.
 */

import { useSyncExternalStore } from "react";

export const DOCK_SLOTS_KEY = "tbos.dock.slots";
export const SLOT_COUNT = 3;

/** Varsayılan yuvalar: Sohbet · Arama · WhatsApp. */
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
  const out = arr.slice(0, SLOT_COUNT);
  while (out.length < SLOT_COUNT) out.push(DEFAULT_SLOTS[out.length] ?? "messenger");
  return out;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(DOCK_SLOTS_KEY);
    slots = raw ? normalize(JSON.parse(raw)) : DEFAULT_SLOTS;
  } catch {
    slots = DEFAULT_SLOTS;
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

/** Yuvaya uygulama yerleştirir; aynı uygulama başka yuvadaysa yer değiştirir. */
export function setDockSlot(index: number, appId: string) {
  if (index < 0 || index >= SLOT_COUNT) return;
  const next = [...slots];
  const existing = next.indexOf(appId);
  if (existing === index) return;
  if (existing >= 0) next[existing] = next[index] ?? DEFAULT_SLOTS[existing] ?? "messenger";
  next[index] = appId;
  slots = normalize(next);
  persist();
  emit();
}

/** İki yuvayı takas eder (sürükle-bırak ile yeniden sıralama). */
export function swapDockSlots(a: number, b: number) {
  if (a === b) return;
  const next = [...slots];
  const tmp = next[a];
  next[a] = next[b] as string;
  next[b] = tmp as string;
  slots = normalize(next);
  persist();
  emit();
}

export function resetDockSlots() {
  slots = DEFAULT_SLOTS;
  persist();
  emit();
}
