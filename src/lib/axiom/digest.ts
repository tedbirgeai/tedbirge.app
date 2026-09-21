/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * BAYT ÖZETİ (Faz 1)
 * ------------------------------------------------------------------
 * Faz 1'de girdi doğrulanmaz — yalnız ASK ASCII/1.0 katmanının göreceği
 * bayt görünümü hesaplanır: uzunluk, ilk baytların onaltılık dökümü ve
 * saf ASCII olup olmadığı. Doğrulama motoru Faz 3'te bağlanır; bu
 * yüzden burada hiçbir "kanıtlandı" çıktısı üretilmez.
 */

export type ByteDigest = {
  text: string;
  bytes: number;
  chars: number;
  /** İlk 16 baytın onaltılık gösterimi. */
  head: string;
  /** Tüm baytlar 0x00–0x7F aralığında mı? */
  ascii: boolean;
  /** Basit toplam (FNV-1a 32 bit) — yalnız görünür parmak izi. */
  fingerprint: string;
};

export function byteDigest(text: string): ByteDigest {
  const bytes = new TextEncoder().encode(text);
  let hash = 0x811c9dc5;
  let ascii = true;
  for (const b of bytes) {
    if (b > 0x7f) ascii = false;
    hash ^= b;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const head = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
  return {
    text,
    bytes: bytes.length,
    chars: [...text].length,
    head,
    ascii,
    fingerprint: `0x${hash.toString(16).padStart(8, "0")}`,
  };
}
