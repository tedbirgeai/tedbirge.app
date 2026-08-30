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
const DB_VERSION = 2;
const STORE = "files";

/**
 * Şema kilidi: depo sürümü tek kaynaktan okunur. Bir üst sürüme geçiş
 * yalnız `openDb` içindeki `onupgradeneeded` yolundan yapılır; eski
 * kayıtlar `normalizeEntry` ile ileri uyumlu hâle getirilir.
 */
export const VFS_SCHEMA_VERSION = DB_VERSION;

/** Kullanıcıya görünen sabit klasörler. */
export const VFS_FOLDERS = ["Belgeler", "Görseller", "Medya", "İndirilenler"] as const;
export type VfsFolder = (typeof VFS_FOLDERS)[number];

export const DEFAULT_FOLDER: VfsFolder = "Belgeler";

/** MIME türünden önerilen klasör. */
export function folderForMime(mime: string): VfsFolder {
  if (mime.startsWith("image/")) return "Görseller";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "Medya";
  return "Belgeler";
}

/** Şema dışı klasör adını reddeder; MIME'e göre geçerli klasöre düşer. */
export function normalizeFolder(folder: unknown, mime = ""): VfsFolder {
  return (VFS_FOLDERS as readonly string[]).includes(folder as string)
    ? (folder as VfsFolder)
    : folderForMime(mime);
}

export type VfsEntry = {
  id: string;
  name: string;
  mime: string;
  size: number;
  at: number;
  folder: VfsFolder;
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
    .map(({ blob: _blob, ...meta }) => ({
      ...meta,
      // v1 kayıtlarında klasör yoktur: türüne göre yerleştirilir.
      folder: (VFS_FOLDERS as readonly string[]).includes(meta.folder)
        ? meta.folder
        : folderForMime(meta.mime),
    }))
    .sort((a, b) => b.at - a.at);
}

/** Cihazdan seçilen/sürüklenen dosyaları depoya yazar. */
export async function saveFiles(files: File[], folder?: VfsFolder): Promise<VfsEntry[]> {
  const saved: VfsEntry[] = [];
  for (const f of files) {
    const mime = f.type || "application/octet-stream";
    const rec: VfsRecord = {
      id: `${f.name}_${f.size}_${f.lastModified}`,
      name: f.name,
      mime,
      size: f.size,
      at: Date.now(),
      folder: folder ?? folderForMime(mime),
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

/** Kaydın üstverisini günceller (yeniden adlandırma / klasör taşıma). */
async function patch(id: string, next: Partial<Pick<VfsEntry, "name" | "folder">>): Promise<void> {
  const rec = await tx<VfsRecord | undefined>(
    "readonly",
    (s) => s.get(id) as IDBRequest<VfsRecord | undefined>,
  );
  if (!rec) return;
  const updated: VfsRecord = { ...rec, ...next };
  await tx("readwrite", (s) => s.put(updated) as IDBRequest<IDBValidKey>);
  const cached = urls.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    urls.delete(id);
  }
  emit();
}

/** Dosyayı yeniden adlandırır. */
export function renameFile(id: string, name: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return Promise.resolve();
  return patch(id, { name: clean });
}

/** Dosyayı başka bir klasöre taşır. */
export function moveFile(id: string, folder: VfsFolder): Promise<void> {
  return patch(id, { folder });
}

export async function deleteFile(id: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
  const cached = urls.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    urls.delete(id);
  }
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

/** Kalıcı depolama izni daha önce verilmiş mi? */
export async function isPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persisted) return false;
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/** Depodaki tüm dosyaları siler (yerel önbellek temizliği). */
export async function clearVfs(): Promise<void> {
  const list = await listFiles();
  for (const f of list) await tx("readwrite", (s) => s.delete(f.id) as IDBRequest<undefined>);
  releaseUrls();
  emit();
}

type VfsBackup = {
  format: "tedbirge-vfs";
  version: 1;
  at: number;
  files: Array<{ name: string; mime: string; data: string }>;
};

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i] as number);
  return btoa(s);
}

function fromBase64(data: string): Uint8Array {
  const bin = atob(data);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/** Tüm yerel dosyaları tek bir yedek nesnesine çevirir (.json). */
export async function exportVfs(): Promise<VfsBackup> {
  const list = await listFiles();
  const files: VfsBackup["files"] = [];
  for (const meta of list) {
    const file = await readFile(meta.id);
    if (!file) continue;
    files.push({ name: file.name, mime: file.type, data: toBase64(await file.arrayBuffer()) });
  }
  return { format: "tedbirge-vfs", version: 1, at: Date.now(), files };
}

/** Yedek dosyasını geri yükler; kaç dosyanın yazıldığını döner. */
export async function importVfs(json: unknown): Promise<number> {
  const backup = json as Partial<VfsBackup>;
  if (!backup || backup.format !== "tedbirge-vfs" || !Array.isArray(backup.files)) {
    throw new Error("Bu dosya bir Tedbirge yedeği değil.");
  }
  const files = backup.files.map(
    (f) =>
      new File([fromBase64(f.data) as unknown as BlobPart], f.name, {
        type: f.mime || "application/octet-stream",
      }),
  );
  const saved = await saveFiles(files);
  return saved.length;
}

/** Türüne göre (ses/video/görsel) kayıtları süzer — Medya ve Müzik kütüphaneleri. */
export async function listByKind(prefix: "audio/" | "video/" | "image/"): Promise<VfsEntry[]> {
  const all = await listFiles();
  return all.filter((f) => f.mime.startsWith(prefix));
}
