/**
 * TERMİNAL YOL ÇÖZÜMLEYİCİ
 * ------------------------------------------------------------------
 * VFS kök klasör şeması ("/Belgeler", "/Görseller", "/Medya",
 * "/İndirilenler", "/repo") üzerine POSIX benzeri bir dizin görünümü
 * kurar. Kök klasörlerin altında çok seviyeli dizinler (LIMEN'den mount
 * edilen proje/delta ağacı) gezilebilir. VFS deposunun API'si değişmez;
 * burası yalnız ad çözümlemesi yapar.
 */

import { VFS_FOLDERS, type VfsFolder } from "@/lib/vfs/store";

export const ROOT = "/";

/** Yolun geçerli bir kök klasör olup olmadığını söyler. */
export function isFolderPath(path: string): path is `/${VfsFolder}` {
  const name = path.replace(/^\//, "");
  return (VFS_FOLDERS as readonly string[]).includes(name);
}

/** Yol içinden kök klasör adını verir (kökte null). */
export function folderOf(path: string): VfsFolder | null {
  const name = path.replace(/^\//, "").split("/")[0] ?? "";
  return (VFS_FOLDERS as readonly string[]).includes(name) ? (name as VfsFolder) : null;
}

/** Yolun klasör içindeki alt dizin parçası ("" ise klasör kökü). */
export function subPathOf(path: string): string {
  return path.replace(/^\//, "").split("/").slice(1).join("/");
}

/** `cd` hedefini normalize eder; geçersizse null. */
export function resolvePath(cwd: string, target: string): string | null {
  if (!target || target === ".") return cwd;
  const parts = (target.startsWith("/") ? target : `${cwd}/${target}`).split("/");
  const stack: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") {
      stack.pop();
      continue;
    }
    stack.push(p);
  }
  if (stack.length === 0) return ROOT;
  if (!isFolderPath(`/${stack[0]}`)) return null;
  return `/${stack.join("/")}`;
}

/**
 * Bir dosya argümanını { klasör, ad } ikilisine böler. `ad` klasör
 * köküne göre tam yoldur (örn. "tedbirge/limen.json"), böylece depo
 * kaydıyla birebir eşleşir.
 */
export function splitTarget(
  cwd: string,
  arg: string,
): { folder: VfsFolder | null; name: string } | null {
  if (!arg) return null;
  const idx = arg.lastIndexOf("/");
  const base = idx < 0 ? arg : arg.slice(idx + 1);
  if (!base) return null;
  const dir = idx < 0 ? cwd : arg.slice(0, idx) || ROOT;
  const resolved = resolvePath(cwd, dir);
  if (resolved === null) return null;
  const sub = subPathOf(resolved);
  return { folder: folderOf(resolved), name: sub ? `${sub}/${base}` : base };
}
