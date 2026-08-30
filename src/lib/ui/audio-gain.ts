/**
 * SİSTEM SES SEVİYESİ
 * ------------------------------------------------------------------
 * Kontrol Merkezindeki ses sürgüsü buraya yazar; tüm arayüz sesleri
 * üretilirken kazanç (gain) bu katsayı ile çarpılır. Değer kalıcıdır.
 */

import { useSyncExternalStore } from "react";

const KEY = "tedbirge.volume";

let volume = 1;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const v = Number(localStorage.getItem(KEY));
    if (Number.isFinite(v) && v >= 0 && v <= 1) volume = v;
  } catch {
    volume = 1;
  }
  listeners.forEach((l) => l());
}

/** Ses üretiminde kullanılan 0–1 aralığındaki kazanç katsayısı. */
export function getVolume(): number {
  if (!hydrated) hydrate();
  return volume;
}

export function setVolume(next: number) {
  volume = Math.min(1, Math.max(0, next));
  try {
    localStorage.setItem(KEY, String(volume));
  } catch {
    /* yoksay */
  }
  listeners.forEach((l) => l());
}

export function useVolume(): number {
  return useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => volume,
    () => 1,
  );
}
