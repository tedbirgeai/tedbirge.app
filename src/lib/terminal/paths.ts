/**
 * TERMİNAL YOL ÇÖZÜMLEYİCİ
 * ------------------------------------------------------------------
 * VFS sabit klasör şeması ("/Belgeler", "/Görseller", "/Medya",
 * "/İndirilenler") üzerine POSIX benzeri bir dizin görünümü kurar.
 * VFS deposunun API'si değişmez; burası yalnız ad çözümlemesi yapar.
 */

import { VFS_FOLDERS, type VfsFolder } from "@/lib/vfs/store";

export const ROOT = "/";

/** Yolun geçerli bir kök klasör olup olmadığını söyler. */
export function isFolderPath(path: string): path is `/${VfsFolder}` {
  const name = path.replace(/^\//, "");
  return (VFS_FOLDERS as readonly string[]).includes(name);
}

/** Yol içinden klasör adını verir (kökte null). */
export function folderOf(path: string): VfsFolder | null {
  const name = path.replace(/^\//, "").split("/")[0] ?? "";
  return (VFS_FOLDERS as readonly string[]).includes(name) ? (name as VfsFolder) : null;
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
  if (stack.length > 1) return null;
  const path = `/${stack[0]}`;
  return isFolderPath(path) ? path : null;
}

/** Bir dosya argümanını { klasör, ad } ikilisine böler. */
export function splitTarget(
  cwd: string,
  arg: string,
): { folder: VfsFolder | null; name: string } | null {
  if (!arg) return null;
  if (!arg.includes("/")) return { folder: folderOf(cwd), name: arg };
  const idx = arg.lastIndexOf("/");
  const dir = arg.slice(0, idx) || ROOT;
  const name = arg.slice(idx + 1);
  const resolved = resolvePath(cwd, dir);
  if (resolved === null) return null;
  return { folder: folderOf(resolved), name };
}
