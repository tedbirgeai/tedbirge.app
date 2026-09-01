/**
 * EKRAN OKUYUCU DUYURU KANALI (aria-live)
 * ------------------------------------------------------------------
 * ISO 9241-171: pencere açılma/kapanma, odak değişimi ve sistem
 * bildirimleri tek bir `aria-live="polite"` bölgesinden seslendirilir.
 * Bileşenler doğrudan DOM'a yazmaz; bu depoya mesaj gönderir.
 */

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let message = "";

function emit() {
  for (const fn of listeners) fn();
}

/** Ekran okuyucuya tek satırlık duyuru gönderir. */
export function announce(text: string) {
  if (!text) return;
  // Aynı metin art arda gelirse okuyucunun tekrar seslendirmesi için
  // görünmez bir ayraç eklenir.
  message = message === text ? `${text} ` : text;
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useAnnouncement(): string {
  return useSyncExternalStore(
    subscribe,
    () => message,
    () => "",
  );
}
