/**
 * YAZI TİPİ ÖLÇEĞİ
 * ------------------------------------------------------------------
 * Seçim `localStorage`'da kalıcıdır ve yalnız `--tb-font-scale`
 * değişkenine yazılır; tüm pencereler bu değişkeni okuduğu için
 * değişim saf CSS yeniden boyamadır.
 */

import { useSyncExternalStore } from "react";

export const FONT_SCALE_KEY = "tedbirge.fontscale";

export type FontScaleId = "kucuk" | "normal" | "buyuk" | "cokbuyuk";

export const FONT_SCALES: ReadonlyArray<{
  id: FontScaleId;
  label: string;
  hint: string;
  value: number;
}> = [
  { id: "kucuk", label: "Küçük", hint: "Daha fazla içerik sığar", value: 0.9 },
  { id: "normal", label: "Normal", hint: "Varsayılan ölçek", value: 1 },
  { id: "buyuk", label: "Büyük", hint: "Rahat okuma", value: 1.12 },
  { id: "cokbuyuk", label: "Çok Büyük", hint: "Düşük görme desteği", value: 1.25 },
];

export const DEFAULT_FONT_SCALE: FontScaleId = "normal";

function isScale(v: string | null): v is FontScaleId {
  return !!v && FONT_SCALES.some((s) => s.id === v);
}

let current: FontScaleId = DEFAULT_FONT_SCALE;
let hydrated = false;
const listeners = new Set<() => void>();

function valueOf(id: FontScaleId): number {
  return FONT_SCALES.find((s) => s.id === id)?.value ?? 1;
}

function apply() {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--tb-font-scale", String(valueOf(current)));
  document.documentElement.dataset["fontScale"] = current;
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(FONT_SCALE_KEY);
    if (isScale(stored)) current = stored;
  } catch {
    /* depolama kapalı olabilir */
  }
  apply();
}

/** Ölçeği uygular ve tercihi kalıcılaştırır. */
export function setFontScale(id: FontScaleId): void {
  hydrate();
  current = id;
  apply();
  try {
    localStorage.setItem(FONT_SCALE_KEY, id);
  } catch {
    /* depolama kapalı olabilir */
  }
  listeners.forEach((l) => l());
}

export function getFontScale(): FontScaleId {
  hydrate();
  return current;
}

/** Bileşenlerin aktif ölçeği izlemesi için abonelik. */
export function useFontScale(): FontScaleId {
  return useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => getFontScale(),
    () => DEFAULT_FONT_SCALE,
  );
}
