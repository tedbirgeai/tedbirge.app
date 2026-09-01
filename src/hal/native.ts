/**
 * HAL — YEREL KABUK KÖPRÜSÜ (FAZ 8)
 * ------------------------------------------------------------------
 * Kabuk `tedbirge-shell` tarafından sunulduğunda (bare-metal ISO, SBC
 * ya da masaüstü daemon) dosyalar tarayıcı IndexedDB'sinde değil, gerçek
 * blok aygıtta durur. Yerel kabuk bunu üç uçla açar:
 *
 *   GET /hal/report      → donanım raporu (ekran, girdi, disk, taşıyıcı)
 *   GET /hal/files       → native VFS üstverisi
 *   GET /hal/file/<id>   → dosya içeriği
 *
 * Köprü salt-okunurdur: yazma ve silme tarayıcı deposunda kalır, okuma
 * ve listeleme donanım deposuyla birleştirilir. Uç yoksa (normal web
 * dağıtımı) hiçbir şey değişmez ve `registerHal` çağrılmaz.
 */

import { registerHal, type StorageHal } from "@/hal/index";
import { webStorageHal } from "@/hal/storage";
import type { VfsEntry, VfsFolder } from "@/lib/vfs/store";

export type NativeHalReport = {
  target: "native";
  display: string;
  width: number;
  height: number;
  input: number;
  interfaces: number;
  disks: number;
  audio: boolean;
  serial: boolean;
  link: string;
  storage: string;
};

type NativeFile = {
  id: string;
  name: string;
  size: number;
  folder: string;
  createdAt: number;
};

let report: NativeHalReport | null = null;

/** Yerel kabuk raporu (yalnız native kolda dolu). */
export function nativeHalReport(): NativeHalReport | null {
  return report;
}

function toEntry(f: NativeFile): VfsEntry {
  return {
    id: f.id,
    name: f.name,
    mime: "application/octet-stream",
    size: f.size,
    at: f.createdAt * 1000,
    folder: (f.folder || "Belgeler") as VfsFolder,
  };
}

async function nativeList(): Promise<NativeFile[]> {
  const res = await fetch("/hal/files", { cache: "no-store" });
  if (!res.ok) return [];
  const body = (await res.json()) as { files?: NativeFile[] };
  return body.files ?? [];
}

/** Donanım deposunu tarayıcı deposunun üstüne bindiren adaptör. */
function nativeStorageHal(): StorageHal {
  return {
    list: async () => {
      const [web, native] = await Promise.all([
        webStorageHal.list(),
        nativeList().catch(() => [] as NativeFile[]),
      ]);
      const seen = new Set(web.map((f) => f.id));
      return [...web, ...native.filter((f) => !seen.has(f.id)).map(toEntry)];
    },
    // Yazma/silme tarayıcı deposunda kalır: köprü salt-okunurdur.
    write: (files, folder) => webStorageHal.write(files, folder),
    remove: (id) => webStorageHal.remove(id),
    read: async (id) => {
      const local = await webStorageHal.read(id);
      if (local) return local;
      const res = await fetch(`/hal/file/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) return null;
      const blob = await res.blob();
      const meta = (await nativeList().catch(() => [])).find((f) => f.id === id);
      return new File([blob], meta?.name ?? id, { lastModified: (meta?.createdAt ?? 0) * 1000 });
    },
    stat: async () => {
      const base = await webStorageHal.stat();
      const native = await nativeList().catch(() => [] as NativeFile[]);
      return {
        ...base,
        files: base.files + native.length,
        bytes: base.bytes + native.reduce((sum, f) => sum + f.size, 0),
      };
    },
  };
}

/**
 * Yerel kabuğu yoklar; varsa native depolama adaptörünü devreye alır.
 * Web dağıtımında uç 404 döner ve hiçbir kayıt yapılmaz.
 */
export async function detectNativeHal(): Promise<NativeHalReport | null> {
  if (typeof window === "undefined" || report) return report;
  // Web dağıtımında yerel kabuk yoktur: 404 üreten gereksiz istek atılmaz,
  // konsol temiz kalır. Yalnız native kabuk (Tauri/Capacitor) yoklanır.
  const shell = window as Window & { __TAURI__?: unknown; Capacitor?: unknown };
  if (!shell.__TAURI__ && !shell.Capacitor) return null;
  try {
    const res = await fetch("/hal/report", { cache: "no-store" });
    if (!res.ok) return null;

    const body = (await res.json()) as Partial<NativeHalReport>;
    if (body.target !== "native") return null;
    report = body as NativeHalReport;
    registerHal({ storage: nativeStorageHal() }, "native");
    return report;
  } catch {
    return null;
  }
}
