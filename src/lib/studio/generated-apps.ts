/**
 * ÜRETİLEN UYGULAMA KAYIT DEFTERİ
 * ------------------------------------------------------------------
 * AxiomStudio'nun ürettiği uygulamalar burada saklanır; masaüstü, Dock ve
 * pencere yöneticisi aynı defteri okur. Tarif (bloklar) ve derlenmiş Wasm
 * modülü cihazda kalır — hiçbiri ağa gönderilmez.
 */

import { useSyncExternalStore } from "react";

import type { GeneratedSpec } from "@/lib/studio/generator";

export type GeneratedApp = {
  spec: GeneratedSpec;
  /** data:application/wasm;base64,… (derleme başarısızsa boş). */
  module: string;
};

const KEY = "tbos.generated.apps";

const listeners = new Set<() => void>();
let cache: GeneratedApp[] = [];
let hydrated = false;

function hydrate(): GeneratedApp[] {
  if (hydrated || typeof window === "undefined") return cache;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as GeneratedApp[]) : [];
    cache = list.filter((a) => a?.spec?.id && Array.isArray(a.spec.blocks));
  } catch {
    cache = [];
  }
  return cache;
}

function persist() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* depolama kapalı olabilir */
  }
}

function emit() {
  cache = [...cache];
  listeners.forEach((l) => l());
}

export function generatedApps(): GeneratedApp[] {
  return hydrate();
}

export function generatedApp(id: string): GeneratedApp | undefined {
  return hydrate().find((a) => a.spec.id === id);
}

export function saveGeneratedApp(app: GeneratedApp): void {
  hydrate();
  cache = [...cache.filter((a) => a.spec.id !== app.spec.id), app];
  persist();
  emit();
}

export function removeGeneratedApp(id: string): void {
  hydrate();
  const next = cache.filter((a) => a.spec.id !== id);
  if (next.length === cache.length) return;
  cache = next;
  persist();
  emit();
}

function subscribe(l: () => void): () => void {
  hydrate();
  listeners.add(l);
  return () => listeners.delete(l);
}

const SERVER: GeneratedApp[] = [];

export function useGeneratedApps(): GeneratedApp[] {
  return useSyncExternalStore(subscribe, generatedApps, () => SERVER);
}

/** Test yardımcısı. */
export function __resetGeneratedApps(): void {
  cache = [];
  hydrated = true;
  persist();
  emit();
}
