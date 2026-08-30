/**
 * HAL — GÖRÜNTÜ / KOMPOZİTÖR SOYUTLAMASI
 * ------------------------------------------------------------------
 * Pencere açma, taşıma, boyutlandırma ve kapatma işlemleri tek bir
 * sözleşmeden geçer. Tarayıcı kolunda DOM/Canvas2D pencere yöneticisi
 * (`src/shell/windows.ts`) uygular; çıplak donanım kolunda aynı arayüz
 * wgpu/Vulkan kompozitörü tarafından uygulanacaktır.
 */

import {
  closeWindow,
  focusWindow,
  openWindow,
  placeWindow,
  type WindowRecord,
} from "@/shell/windows";

export type HalSurface = WindowRecord;

export interface DisplayHal {
  /** Yeni yüzey (pencere) açar; yüzey kimliğini döner. */
  surface: (appId: string, title: string, fresh?: boolean) => string;
  /** Yüzeyi konumlandırır ve boyutlandırır. */
  present: (id: string, x: number, y: number, w: number, h: number) => void;
  /** Yüzeyi öne alır (girdi odağı). */
  focus: (id: string) => void;
  /** Yüzeyi kapatır. */
  dismiss: (id: string) => void;
}

/** Tarayıcı uygulaması — mevcut WindowShell pencere yöneticisini sarar. */
export const webDisplayHal: DisplayHal = {
  surface: (appId, title, fresh) => openWindow(appId, title, fresh),
  present: (id, x, y, w, h) => placeWindow(id, x, y, w, h),
  focus: (id) => focusWindow(id),
  dismiss: (id) => closeWindow(id),
};
