/**
 * BİLDİRİM MERKEZİ (Notification Center)
 * ------------------------------------------------------------------
 * Sistem olayları (bağlantı, dosya aktarımı, lisans/ödeme, hata) tek
 * bir mağazada toplanır. Üst bardaki zil ikonu bu mağazayı dinler.
 * Yalnız bellekte + localStorage'da tutulur; hiçbir sunucuya gitmez.
 */

import { useSyncExternalStore } from "react";

export type NoticeKind = "info" | "ok" | "error";

export type Notice = {
  id: string;
  title: string;
  detail?: string;
  kind: NoticeKind;
  at: number;
  read: boolean;
};

const KEY = "tedbirge:notices";
const LIMIT = 50;

let notices: Notice[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(notices.slice(0, LIMIT)));
  } catch {
    /* depolama kapalı olabilir */
  }
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) notices = (JSON.parse(raw) as Notice[]).slice(0, LIMIT);
  } catch {
    notices = [];
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

export function pushNotice(kind: NoticeKind, title: string, detail?: string) {
  hydrate();
  const notice: Notice = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    kind,
    at: Date.now(),
    read: false,
    ...(detail ? { detail } : {}),
  };
  notices = [notice, ...notices].slice(0, LIMIT);
  emit();
}

export function markAllNoticesRead() {
  hydrate();
  notices = notices.map((n) => (n.read ? n : { ...n, read: true }));
  emit();
}

export function clearNotices() {
  notices = [];
  emit();
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): Notice[] {
  hydrate();
  return notices;
}

const EMPTY: Notice[] = [];

export function useNotices(): Notice[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function useUnreadNoticeCount(): number {
  return useNotices().filter((n) => !n.read).length;
}
