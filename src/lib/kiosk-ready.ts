/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * KIOSK ÇİZİM SİNYALİ
 * ------------------------------------------------------------------
 * ISO kiosk betiği (`kiosk.sh::sayfa_sagligi`) masaüstünün gerçekten
 * çizildiğini sayfa başlığındaki işaretle anlar. İşaret yalnız kiosk
 * kipinde (`?kiosk=1`) ve ilk iki kare çizildikten sonra eklenir;
 * beyaz ekranda kalan (kare çizemeyen) sayfa işaret üretmez.
 */

export const KIOSK_READY_MARK = "· TB_READY";

export function isKioskMode(search: string): boolean {
  return new URLSearchParams(search).get("kiosk") === "1";
}

export function withReadyMark(title: string): string {
  return title.includes(KIOSK_READY_MARK) ? title : `${title} ${KIOSK_READY_MARK}`.trim();
}

/** İşareti ekler ve rota başlığı değişse de korur. Temizleme fonksiyonu döner. */
export function startKioskReadySignal(): () => void {
  if (typeof window === "undefined" || !isKioskMode(window.location.search)) return () => {};
  let observer: MutationObserver | null = null;
  let r2 = 0;
  const r1 = requestAnimationFrame(() => {
    r2 = requestAnimationFrame(() => {
      document.title = withReadyMark(document.title);
      const el = document.querySelector("title");
      if (!el) return;
      observer = new MutationObserver(() => {
        if (!document.title.includes(KIOSK_READY_MARK)) document.title = withReadyMark(document.title);
      });
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  });
  return () => {
    cancelAnimationFrame(r1);
    cancelAnimationFrame(r2);
    observer?.disconnect();
  };
}
