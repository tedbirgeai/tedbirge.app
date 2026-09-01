/**
 * BARE-METAL İMAJ YAYIN ADRESİ — TEK DOĞRULUK KAYNAĞI
 * ------------------------------------------------------------------
 * Hazır (önyüklenebilir) imaj bir GitHub Release ya da CDN üzerinde
 * yayınlandığında `VITE_ISO_DOWNLOAD_URL` tanımlanır ve indirme akışı
 * kod değişikliği olmadan devreye girer.
 *
 * Adres tanımlı değilse hiçbir sahte indirme başlatılmaz; arayüz
 * kullanıcıya dürüst iki seçenek sunar (PWA kurulumu / yerel derleme).
 */

const RAW = (import.meta.env["VITE_ISO_DOWNLOAD_URL"] as string | undefined) ?? "";

/** Yapılandırılmış uzak imaj adresi; tanımlı değilse boş metin. */
export const ISO_DOWNLOAD_URL = RAW.trim();

/** Hazır imaj adresi tanımlı mı? */
export function hasRemoteIso(): boolean {
  return ISO_DOWNLOAD_URL.length > 0;
}

/** Kurulum kiti (yalnız yerel derleme rehberi içinde sunulur). */
export const ISO_KIT_ROUTE = "/api/public/iso";
