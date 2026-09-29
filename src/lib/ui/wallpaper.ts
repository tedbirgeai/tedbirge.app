/**
 * DUVAR KAĞIDI VE YÜZEY PARLAKLIĞI
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
import mesh from "@/assets/wallpaper-mesh.jpg";
import dark from "@/assets/wallpaper-dark.jpg";

export const WALLPAPER_KEY = "tedbirge.wallpaper";
export const BRIGHTNESS_KEY = "tedbirge.brightness";
export const NIGHT_KEY = "tedbirge.nightlight";
export const AUTO_KEY = "tedbirge.wallpaper.auto";
export const NIGHT_AUTO_KEY = "tedbirge.nightlight.auto";
const NIGHT_LAST_KEY = "tedbirge.nightlight.last";

export type WallpaperId =
  | "aurora"
  | "ocean"
  | "nature"
  | "crystal"
  | "night"
  | "neon"
  | "mesh"
  | "dark"
  | "live-flow"
  | "live-particles"
  | "custom";

export type Wallpaper = {
  id: WallpaperId;
  label: string;
  hint: string;
  /** Boş ise yalnız tema gradyanı kullanılır. */
  src: string | null;
  theme: ThemeId;
};

export const WALLPAPERS: Wallpaper[] = [
  {
    id: "aurora",
    label: "Tedbirge Işıltı",
    hint: "Sade tema gradyanı",
    src: null,
    theme: "crystal",
  },
  {
    id: "ocean",
    label: "Okyanus — Yunuslar",
    hint: "Turkuaz su, gün ışığı",
    src: ocean,
    theme: "crystal",
  },
  {
    id: "nature",
    label: "Doğa — Dağ ve Orman",
    hint: "Sisli vadi, gün doğumu",
    src: nature,
    theme: "soft",
  },
  {
    id: "crystal",
    label: "Kristal Açık",
    hint: "Buzlu cam yüzeyler",
    src: crystal,
    theme: "crystal",
  },
  { id: "night", label: "Koyu Kristal", hint: "Varsayılan koyu cam", src: night, theme: "night" },
  { id: "neon", label: "Siberpunk Neon", hint: "Neon şehir, gece", src: neon, theme: "night" },
  {
    id: "mesh",
    label: "Mesh Nebula",
    hint: "Ağ düğümleri, derin lacivert",
    src: mesh,
    theme: "night",
  },
  { id: "dark", label: "Dark Minimal", hint: "Gürültüsüz koyu yüzey", src: dark, theme: "night" },
  { id: "live-flow", label: "Canlı Akış", hint: "Saate göre renk değiştiren akışkan gradyan", src: null, theme: "night" },
  { id: "live-particles", label: "Canlı Parçacık", hint: "Yavaş süzülen ışık parçacıkları", src: null, theme: "night" },
];

/** Galeride listelenmeyen, kullanıcının kendi görseli. */
const CUSTOM: Wallpaper = { id: "custom", label: "Kendi görselim", hint: "Cihazda saklanır", src: null, theme: "night" };

export const isLiveWallpaper = (id: WallpaperId) => id === "live-flow" || id === "live-particles";

export type DayPhase = "gunduz" | "aksam" | "gece";

/** Saat → gün evresi. 07–17 gündüz, 17–20 akşam, diğer saatler gece. */
export function dayPhase(hour: number): DayPhase {
  if (hour >= 7 && hour < 17) return "gunduz";
  if (hour >= 17 && hour < 20) return "aksam";
  return "gece";
}

/** Otomatik modda saate göre seçilen duvar kâğıdı ve tema (07:00–19:00 açık). */
export function autoPick(hour: number): { id: WallpaperId; theme: ThemeId } {
  return hour >= 7 && hour < 19 ? { id: "crystal", theme: "crystal" } : { id: "night", theme: "night" };
}

/** Gün batımında otomatik gece ışığı: 20:00–07:00 arası. */
export const nightLightDue = (hour: number) => hour >= 20 || hour < 7;

export const DEFAULT_WALLPAPER: WallpaperId = "night";

function isWallpaper(v: string | null): v is WallpaperId {
  return !!v && (v === "custom" || WALLPAPERS.some((w) => w.id === v));
}

export function wallpaperInfo(id: WallpaperId): Wallpaper | undefined {
  return id === "custom" ? CUSTOM : WALLPAPERS.find((w) => w.id === id);
}

type State = {
  id: WallpaperId;
  brightness: number;
  night: number;
  auto: boolean;
  nightAuto: boolean;
  customUrl: string | null;
};

let state: State = { id: DEFAULT_WALLPAPER, brightness: 1, night: 0, auto: false, nightAuto: false, customUrl: null };
const SERVER_STATE: State = { id: DEFAULT_WALLPAPER, brightness: 1, night: 0, auto: false, nightAuto: false, customUrl: null };
let hydrated = false;
const listeners = new Set<() => void>();

function apply() {
  if (typeof document === "undefined") return;
  const wp = wallpaperInfo(state.id);
  const root = document.documentElement;
  const src = state.id === "custom" ? state.customUrl : wp?.src;
  root.style.setProperty("--tb-wallpaper-image", src ? `url(${src})` : "none");
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
    localStorage.setItem(AUTO_KEY, state.auto ? "1" : "0");
    localStorage.setItem(NIGHT_AUTO_KEY, state.nightAuto ? "1" : "0");
  } catch {
    /* depolama kapalı olabilir */
  }
}

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

function hydrate(notify = true) {
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
      auto: localStorage.getItem(AUTO_KEY) === "1",
      nightAuto: localStorage.getItem(NIGHT_AUTO_KEY) === "1",
      customUrl: null,
    };
  } catch {
    state = { ...SERVER_STATE };
  }
  if (state.id === "custom")
    void loadCustomBlob().then((blob) => {
      if (!blob) return;
      state.customUrl = URL.createObjectURL(blob);
      apply();
      emit();
    });
  apply();
  if (notify) emit();
}

export function useWallpaper(): State {
  return useSyncExternalStore(
    (l) => {
      hydrate(false);
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => {
      hydrate(false);
      return state;
    },
    () => SERVER_STATE,
  );
}

/** Duvar kâğıdını uygular; `withTheme` ile önerdiği tema da geçer. */
export function setWallpaper(id: WallpaperId, withTheme = true) {
  const wp = wallpaperInfo(id);
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

/** Tek dokunuşla gece ışığı: kapalıysa son yoğunluk (varsayılan 0.35) açılır. */
export function toggleNightLight() {
  if (state.night > 0) {
    try {
      localStorage.setItem(NIGHT_LAST_KEY, String(state.night));
    } catch {
      /* depolama kapalı */
    }
    setNightLight(0);
  } else {
    let last = 0.35;
    try {
      const v = Number(localStorage.getItem(NIGHT_LAST_KEY));
      if (v > 0) last = v;
    } catch {
      /* depolama kapalı */
    }
    setNightLight(last);
  }
}

export function setAutoWallpaper(on: boolean) {
  state.auto = on;
  persist();
  emit();
  if (on) tickSchedule(new Date());
}

export function setNightLightAuto(on: boolean) {
  state.nightAuto = on;
  persist();
  emit();
  if (on) tickSchedule(new Date());
}

/* ---------------- Kendi görselim (IndexedDB) ---------------- */
const DB = "tedbirge-wallpaper";
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("img");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function loadCustomBlob(): Promise<Blob | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await idb();
  return new Promise((res) => {
    const q = db.transaction("img").objectStore("img").get("custom");
    q.onsuccess = () => res((q.result as Blob | undefined) ?? null);
    q.onerror = () => res(null);
  });
}
async function saveCustomBlob(blob: Blob) {
  const db = await idb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction("img", "readwrite");
    tx.objectStore("img").put(blob, "custom");
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

/** Görseli en fazla 2560 px'e küçültür (JPEG). */
async function downscale(blob: Blob, max = 2560): Promise<Blob> {
  const bmp = await createImageBitmap(blob);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k);
  const h = Math.round(bmp.height * k);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Görsel işlenemedi"))), "image/jpeg", 0.88),
  );
}

export async function setCustomWallpaper(blob: Blob) {
  if (!blob.type.startsWith("image/")) throw new Error("Yalnız görsel dosyaları seçilebilir");
  const small = await downscale(blob);
  await saveCustomBlob(small);
  if (state.customUrl) URL.revokeObjectURL(state.customUrl);
  state.customUrl = URL.createObjectURL(small);
  state.auto = false;
  setWallpaper("custom", false);
}

/* ---------------- Zamanlayıcı ---------------- */
function tickSchedule(now: Date) {
  const h = now.getHours();
  if (state.auto) {
    const pick = autoPick(h);
    if (state.id !== pick.id) setWallpaper(pick.id, false);
    setTheme(pick.theme);
  }
  if (state.nightAuto) {
    const due = nightLightDue(h);
    if (due && state.night === 0) setNightLight(0.35);
    if (!due && state.night > 0) setNightLight(0);
  }
}

/** Dakikada bir otomatik duvar kâğıdı / gece ışığı denetimi. */
export function startWallpaperScheduler(): () => void {
  if (typeof window === "undefined") return () => undefined;
  hydrate();
  tickSchedule(new Date());
  const t = setInterval(() => tickSchedule(new Date()), 60_000);
  return () => clearInterval(t);
}
