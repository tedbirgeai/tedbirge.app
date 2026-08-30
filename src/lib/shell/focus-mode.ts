/**
 * ODAK MODU
 * ------------------------------------------------------------------
 * Tek düğmeyle bildirimleri susturur ve masaüstündeki görsel karmaşayı
 * (kartlar, dock etiketleri, duvar kâğıdı deseni) sadeleştirir.
 * Durum `document.documentElement.dataset.focus` üzerinden CSS'e geçer.
 */

import { useSyncExternalStore } from "react";

const KEY = "tedbirge.focus";

let active = false;
let hydrated = false;
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === "undefined") return;
  if (active) document.documentElement.dataset["focus"] = "on";
  else delete document.documentElement.dataset["focus"];
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    active = localStorage.getItem(KEY) === "1";
  } catch {
    active = false;
  }
  apply();
  listeners.forEach((l) => l());
}

export function isFocusMode(): boolean {
  return active;
}

export function setFocusMode(next: boolean) {
  if (active === next) return;
  active = next;
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    /* yoksay */
  }
  apply();
  listeners.forEach((l) => l());
}

export function useFocusMode(): boolean {
  return useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => active,
    () => false,
  );
}
