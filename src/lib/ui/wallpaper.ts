/**
 * DUVAR KÂĞIDI VE YÜZEY PARLAKLIĞI
 * ------------------------------------------------------------------
 * Seçim `localStorage`'da kalıcıdır ve yalnız CSS değişkenlerine yazılır;
 * React yeniden çizimi olmadan uygulanır. Her duvar kâğıdı önerdiği
 * arayüz temasıyla (crystal / soft / night) eşlenir.
 */

import { useSyncExternalStore } from "react";

import { setTheme, type ThemeId } from "@/lib/ui/theme";

import ocean from "@/assets/wallpaper-ocean.jpg";
import nature from "@/assets/wallpaper-nature.jpg";
import crystal from "@/assets/wallpaper-crystal.jpg";
import night from "@/assets/wallpaper-night.jpg";
import neon from "@/assets/wallpaper-neon.jpg";

export const WALLPAPER_KEY = "tedbirge.wallpaper";
export const BRIGHTNESS_KEY = "tedbirge.brightness";
export const NIGHT_KEY = "tedbirge.nightlight";

export type WallpaperId = "aurora" | "ocean" | "nature" | "crystal" | "night" | "neon";

export type Wallpaper = {
  id: WallpaperId;
  label: string;
  hint: string;
  /** Boş ise yalnız tema gradyanı kullanılır. */
  src: string | null;
  theme: ThemeId;
};

export const WALLPAPERS: Wallpaper[] = [
  { id: "aurora", label: "Tedbirge Işıltı", hint: "Sade tema gradyanı", src: null, theme: "crystal" },
  { id: "ocean", label: "Okyanus — Yunuslar", hint: "Turkuaz su, gün ışığı", src: ocean, theme: "crystal" },
  { id: "nature", label: "Doğa — Dağ ve Orman", hint: "Sisli vadi, gün doğumu", src: nature, theme: "soft" },
  { id: "crystal", label: "Kristal Açık", hint: "Buzlu cam yüzeyler", src: crystal, theme: "crystal" },
  { id: "night", label: "Gece Cam", hint: "Koyu cam, düşük ışık", src: night, theme: "night" },
  { id: "neon", label: "Siberpunk Neon", hint: "Neon şehir, gece", src: neon, theme: "night" },
];

export const DEFAULT_WALLPAPER: WallpaperId = "aurora";

function isWallpaper(v: string | null): v is WallpaperId {
  return !!v && WALLPAPERS.some((w) => w.id === v);
}

type State = { id: WallpaperId; brightness: number; night: number };

let state: State = { id: DEFAULT_WALLPAPER, brightness: 1, night: 0 };
let hydrated = false;
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === "undefined") return;
  const wp = WALLPAPERS.find((w) => w.id === state.id);
  const root = document.documentElement;
  root.style.setProperty("--tb-wallpaper-image", wp?.src ? `url(${wp.src})` : "none");
  root.style.setProperty("--tb-brightness", String(state.brightness));
  // Ekran üstü dinamik parlaklık / gece ışığı katmanı bu iki değişkeni okur.
  root.style.setProperty("--tb-dim", String(Math.max(0, 1 - state.brightness)));
  root.style.setProperty("--tb-night", String(state.night));
  root.dataset["wallpaper"] = state.id;
}

function persist() {
  try {
    localStorage.setItem(WALLPAPER_KEY, state.id);
    localStorage.setItem(BRIGHTNESS_KEY, String(state.brightness));
    localStorage.setItem(NIGHT_KEY, String(state.night));
  } catch {
    /* depolama kapalı olabilir */
  }
}

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const id = localStorage.getItem(WALLPAPER_KEY);
    const b = Number(localStorage.getItem(BRIGHTNESS_KEY));
    const n = Number(localStorage.getItem(NIGHT_KEY));
    state = {
      id: isWallpaper(id) ? id : DEFAULT_WALLPAPER,
      brightness: Number.isFinite(b) && b >= 0.4 && b <= 1.2 ? b : 1,
      night: Number.isFinite(n) && n >= 0 && n <= 0.6 ? n : 0,
    };
  } catch {
    state = { id: DEFAULT_WALLPAPER, brightness: 1, night: 0 };
  }
  apply();
  emit();
}

const SERVER_STATE: State = { id: DEFAULT_WALLPAPER, brightness: 1, night: 0 };

export function useWallpaper(): State {
  return useSyncExternalStore(
    (l) => {
      hydrate();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER_STATE,
  );
}

/** Duvar kâğıdını uygular; `withTheme` ile önerdiği tema da geçer. */
export function setWallpaper(id: WallpaperId, withTheme = true) {
  const wp = WALLPAPERS.find((w) => w.id === id);
  if (!wp) return;
  state.id = id;
  apply();
  persist();
  emit();
  if (withTheme) setTheme(wp.theme);
}

export function setBrightness(value: number) {
  state.brightness = Math.min(1.2, Math.max(0.4, value));
  apply();
  persist();
  emit();
}

/** Gece ışığı (sıcak amber filtre) yoğunluğu: 0–0.6. */
export function setNightLight(value: number) {
  state.night = Math.min(0.6, Math.max(0, value));
  apply();
  persist();
  emit();
}
