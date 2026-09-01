/**
 * HAL KAYIT NOKTASI
 * ------------------------------------------------------------------
 * `boot.ts` ile aynı desen: varsayılan olarak tarayıcı (web) adaptörleri
 * kayıtlıdır. Native/bare-metal kabuk aynı modülü kendi adaptörleriyle
 * yeniden kaydederek çekirdek ve uygulama kodunu hiç değiştirmeden
 * devralır.
 */

import { webDisplayHal, type DisplayHal } from "@/hal/display";
import { webInputHal, type InputHal } from "@/hal/input";
import { webNetHal, type NetHal } from "@/hal/net";
import { webStorageHal, type StorageHal } from "@/hal/storage";

export type Hal = {
  storage: StorageHal;
  net: NetHal;
  display: DisplayHal;
  input: InputHal;
};

export type HalTarget = "web" | "native";

let current: Hal = {
  storage: webStorageHal,
  net: webNetHal,
  display: webDisplayHal,
  input: webInputHal,
};

let target: HalTarget = "web";

/** Kısmi veya tam adaptör kümesini devreye alır. */
export function registerHal(next: Partial<Hal>, as: HalTarget = "native") {
  current = { ...current, ...next };
  target = as;
}

/** Etkin donanım soyutlama katmanı. */
export function hal(): Hal {
  return current;
}

/** Hangi kolun etkin olduğunu bildirir (tanılama ekranları için). */
export function halTarget(): HalTarget {
  return target;
}

export type { StorageHal, NetHal, DisplayHal, InputHal };
