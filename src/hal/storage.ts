/**
 * HAL — DEPOLAMA SOYUTLAMASI
 * ------------------------------------------------------------------
 * Faz 2: uygulamalar dosya işlemlerini doğrudan IndexedDB üzerinden
 * değil, bu sözleşme üzerinden yapar. Tarayıcı uygulaması bugünkü
 * `src/lib/vfs/store.ts` davranışını birebir korur; çıplak donanım
 * (bare-metal) kolunda aynı arayüz blok aygıtı/dosya sistemi üzerine
 * uygulanacaktır.
 */

import {
  deleteFile,
  listFiles,
  readFile,
  saveFiles,
  storageUsage,
  type StorageUsage,
  type VfsEntry,
  type VfsFolder,
} from "@/lib/vfs/store";

export type HalFileMeta = VfsEntry;

export interface StorageHal {
  /** Kayıtlı dosyaların üstverisi (içerik okunmaz). */
  list: () => Promise<HalFileMeta[]>;
  /** Dosyaları depoya yazar; yazılan üstveriyi döner. */
  write: (files: File[], folder?: VfsFolder) => Promise<HalFileMeta[]>;
  /** Tek dosyayı içeriğiyle okur. */
  read: (id: string) => Promise<File | null>;
  /** Dosyayı siler. */
  remove: (id: string) => Promise<void>;
  /** Kullanım özeti (dosya sayısı, bayt, kota). */
  stat: () => Promise<StorageUsage>;
}

/** Tarayıcı (PWA) uygulaması — mevcut VFS deposunu sarar. */
export const webStorageHal: StorageHal = {
  list: () => listFiles(),
  write: (files, folder) => saveFiles(files, folder),
  read: (id) => readFile(id),
  remove: (id) => deleteFile(id),
  stat: () => storageUsage(),
};
