/**
 * ÜRETİLEN UYGULAMA YETKİ SINIRI
 * ------------------------------------------------------------------
 * Doğal dilden üretilen uygulamalar yalnız okuma düzeyinde durum bilgisi
 * alabilir. Dosya, ağ ve sistem yetkileri (özellikle `repo.write`) üretim
 * yoluyla verilemez; kaynak ağacı kullanıcı kodundan korunur.
 */

import type { Capability } from "@/kernel/capabilities";

export const ALLOWED_GENERATED_CAPS: readonly Capability[] = ["status.read"];

export function isGeneratedCapAllowed(cap: Capability): boolean {
  return ALLOWED_GENERATED_CAPS.includes(cap);
}
