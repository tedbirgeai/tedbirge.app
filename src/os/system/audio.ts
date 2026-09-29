/**
 * OS SES SİSTEMİ (Web Audio, dosyasız)
 * ------------------------------------------------------------------
 * Tüm sistem efektleri cihazda osilatörlerle üretilir: harici ses
 * dosyası indirilmez, çevrimdışı ve tam kesinti modunda da çalışır.
 * Sessize alma tercihi yerel depoda kalıcıdır ve `useSystemMuted`
 * kancasıyla arayüze canlı yansır.
 */

import { useSyncExternalStore } from "react";

import { getVolume } from "@/lib/ui/audio-gain";

export type SystemSound =
  | "window-open"
  | "window-close"
  | "window-minimize"
  | "window-restore"
  | "trash"
  | "alert"
  | "dock-click";

const MUTE_KEY = "tedbirge.os.sound.muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function isSystemMuted(): boolean {
  return muted;
}

export function setSystemMuted(next: boolean) {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* gizli mod: yalnız oturum boyunca geçerli */
  }
  listeners.forEach((l) => l());
}

export function toggleSystemMuted(): boolean {
  setSystemMuted(!muted);
  return muted;
}

/** Arayüz bileşenleri sessize alma durumunu buradan okur. */
export function useSystemMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
    () => false,
  );
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  return ctx;
}

function bus(ac: AudioContext): GainNode {
  if (!master || master.context !== ac) {
    master = ac.createGain();
    master.connect(ac.destination);
  }
  master.gain.setValueAtTime(getVolume(), ac.currentTime);
  return master;
}

type Layer = {
  freq: number;
  to?: number;
  dur: number;
  delay?: number;
  gain?: number;
  type?: OscillatorType;
};

/** Sistem seslerinin tek tanım tablosu — her efekt saf osilatör katmanı. */
const VOICES: Record<SystemSound, Layer[]> = {
  // Kristal açılış: yükselen iki katman.
  "window-open": [
    { freq: 520, to: 880, dur: 0.11, gain: 0.08, type: "sine" },
    { freq: 1040, dur: 0.07, delay: 0.04, gain: 0.04, type: "triangle" },
  ],
  // Yumuşak sönümlenerek kapanma.
  "window-close": [{ freq: 660, to: 300, dur: 0.12, gain: 0.08, type: "sine" }],
  "window-minimize": [{ freq: 440, to: 200, dur: 0.09, gain: 0.07, type: "triangle" }],
  "window-restore": [{ freq: 220, to: 470, dur: 0.09, gain: 0.07, type: "triangle" }],
  // Çöp/silme: tok ve kısa pıtırtı.
  trash: [
    { freq: 180, to: 90, dur: 0.1, gain: 0.09, type: "square" },
    { freq: 1200, dur: 0.03, gain: 0.03, type: "triangle" },
  ],
  // Hata/uyarı: çift tonlu çan.
  alert: [
    { freq: 520, dur: 0.12, gain: 0.09, type: "sine" },
    { freq: 392, dur: 0.16, delay: 0.1, gain: 0.09, type: "sine" },
  ],
  // Dock tıklaması: cam tıkırtısı.
  "dock-click": [{ freq: 900, dur: 0.025, gain: 0.045, type: "triangle" }],
};

function layer(ac: AudioContext, out: GainNode, l: Layer) {
  const t0 = ac.currentTime + (l.delay ?? 0) + 0.005;
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = l.type ?? "sine";
  osc.frequency.setValueAtTime(l.freq, t0);
  if (l.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, l.to), t0 + l.dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(l.gain ?? 0.08, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + l.dur);
  osc.connect(amp).connect(out);
  osc.start(t0);
  osc.stop(t0 + l.dur + 0.04);
}

/** Sistem sesini çalar; sessizken veya Web Audio yokken sessizce geçer. */
export function playSystemSound(name: SystemSound): boolean {
  if (muted) return false;
  const ac = audio();
  if (!ac) return false;
  const out = bus(ac);
  for (const l of VOICES[name]) layer(ac, out, l);
  return true;
}

/** İlk kullanıcı etkileşiminde ses bağlamını açar (tarayıcı politikası). */
export function unlockSystemAudio() {
  audio();
}

/** Test ve tanılama: tanımlı efekt adları. */
export function systemSoundNames(): SystemSound[] {
  return Object.keys(VOICES) as SystemSound[];
}
