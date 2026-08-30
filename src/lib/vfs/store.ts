/**
 * SANAL DOSYA SİSTEMİ (VFS)
 * ------------------------------------------------------------------
 * Masaüstündeki "Dosyalar" penceresinin kalıcı deposu. Dosyalar Blob
 * olarak IndexedDB'de tutulur; hiçbir veri buluta çıkmaz, yalnız
 * kullanıcı istediğinde eşler arası şifreli kanaldan gönderilir.
 *
 * Nesne URL'leri tek noktadan üretilip geri verilir; pencere kapanınca
 * `releaseUrl` ile bellek serbest bırakılır (sızıntı yok).
 */

const DB_NAME = "tedbirge-vfs";
const DB_VERSION = 1;
const STORE = "files";

export type VfsEntry = {
  id: string;
  name: string;
  mime: string;
  size: number;
  at: number;
};

type VfsRecord = VfsEntry & { blob: Blob };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Bu tarayıcıda yerel depolama kullanılamıyor."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("Depo açılamadı."));
    });
  }
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("Depo işlemi başarısız."));
      }),
  );
}

const listeners = new Set<() => void>();

/** Depo değişimlerini dinler (liste kendini tazeler). */
export function onVfsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((l) => l());
}

// Masaüstü sağ tık menüsündeki "Yenile" komutu depoyu tazeler.
if (typeof window !== "undefined") {
  window.addEventListener("tedbirge:vfs-refresh", () => emit());
}

/** Kayıtlı dosyaların üstverisi (Blob içermez; liste hafif kalır). */
export async function listFiles(): Promise<VfsEntry[]> {
  const all = await tx<VfsRecord[]>("readonly", (s) => s.getAll() as IDBRequest<VfsRecord[]>);
  return all
    .map(({ blob: _blob, ...meta }) => meta)
    .sort((a, b) => b.at - a.at);
}

/** Cihazdan seçilen/sürüklenen dosyaları depoya yazar. */
export async function saveFiles(files: File[]): Promise<VfsEntry[]> {
  const saved: VfsEntry[] = [];
  for (const f of files) {
    const rec: VfsRecord = {
      id: `${f.name}_${f.size}_${f.lastModified}`,
      name: f.name,
      mime: f.type || "application/octet-stream",
      size: f.size,
      at: Date.now(),
      blob: f,
    };
    await tx("readwrite", (s) => s.put(rec) as IDBRequest<IDBValidKey>);
    const { blob: _blob, ...meta } = rec;
    saved.push(meta);
  }
  if (saved.length) emit();
  return saved;
}

/** Depodaki dosyayı `File` olarak geri verir (P2P gönderimi için). */
export async function readFile(id: string): Promise<File | null> {
  const rec = await tx<VfsRecord | undefined>(
    "readonly",
    (s) => s.get(id) as IDBRequest<VfsRecord | undefined>,
  );
  if (!rec) return null;
  return new File([rec.blob], rec.name, { type: rec.mime, lastModified: rec.at });
}

export async function deleteFile(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
  emit();
}

const urls = new Map<string, string>();

/** İndirme/önizleme için nesne URL'i üretir; aynı dosyada tekrar kullanılır. */
export async function objectUrl(id: string): Promise<string | null> {
  const cached = urls.get(id);
  if (cached) return cached;
  const file = await readFile(id);
  if (!file) return null;
  const url = URL.createObjectURL(file);
  urls.set(id, url);
  return url;
}

/** Üretilmiş tüm nesne URL'lerini serbest bırakır. */
export function releaseUrls(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
}

export type StorageUsage = { files: number; bytes: number; quota: number | null };

/** Masaüstü depolama kartı için yerel kullanım özeti. */
export async function storageUsage(): Promise<StorageUsage> {
  let files = 0;
  let bytes = 0;
  try {
    const list = await listFiles();
    files = list.length;
    bytes = list.reduce((sum, f) => sum + f.size, 0);
  } catch {
    /* depo kapalı olabilir */
  }
  let quota: number | null = null;
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      quota = est.quota ?? null;
    }
  } catch {
    /* kota okunamayabilir */
  }
  return { files, bytes, quota };
}

/**
 * Tarayıcıdan kalıcı depolama izni ister; verilirse dosyalar yer
 * baskısı altında bile silinmez (çevrimdışı güvence).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
