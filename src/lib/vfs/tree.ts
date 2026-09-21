/**
 * VFS AĞAÇ GÖRÜNÜMÜ
 * ------------------------------------------------------------------
 * Depo düz bir kayıt listesi tutar; dosya adı içindeki "/" karakterleri
 * mantıksal dizin ayracıdır. Bu modül düz listeyi dizin/dosya ağacına
 * çevirir. Depo API'si değişmez; burada yalnız ad çözümlemesi yapılır.
 */

import type { VfsEntry } from "@/lib/vfs/store";

export type TreeChildren = {
  /** Alt dizin adları (alfabetik). */
  dirs: string[];
  /** Bu dizindeki dosyalar. */
  files: VfsEntry[];
};

/** Yolu normalize eder: baştaki/sondaki "/" düşer, "." ve ".." temizlenir. */
export function normalizeTreePath(path: string): string {
  const stack: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }
  return stack.join("/");
}

/** Kaydın klasör içindeki dizin yolu ("" ise klasör kökü). */
export function dirOf(entry: VfsEntry): string {
  const idx = entry.name.lastIndexOf("/");
  return idx < 0 ? "" : normalizeTreePath(entry.name.slice(0, idx));
}

/** Kaydın yol öneki olmadan görünen adı. */
export function baseName(entry: VfsEntry): string {
  const idx = entry.name.lastIndexOf("/");
  return idx < 0 ? entry.name : entry.name.slice(idx + 1);
}

/** Verilen dizinin doğrudan çocukları (alt dizinler + dosyalar). */
export function childrenOf(entries: VfsEntry[], dir = ""): TreeChildren {
  const base = normalizeTreePath(dir);
  const prefix = base ? `${base}/` : "";
  const dirs = new Set<string>();
  const files: VfsEntry[] = [];
  for (const entry of entries) {
    const name = normalizeTreePath(entry.name);
    if (prefix && !name.startsWith(prefix)) continue;
    const rest = prefix ? name.slice(prefix.length) : name;
    if (!rest) continue;
    const slash = rest.indexOf("/");
    if (slash < 0) files.push(entry);
    else dirs.add(rest.slice(0, slash));
  }
  return {
    dirs: [...dirs].sort((a, b) => a.localeCompare(b, "tr")),
    files: files.sort((a, b) => baseName(a).localeCompare(baseName(b), "tr")),
  };
}

/** Verilen dizinin altındaki tüm kayıtlar (özyinelemeli). */
export function entriesUnder(entries: VfsEntry[], dir = ""): VfsEntry[] {
  const base = normalizeTreePath(dir);
  if (!base) return entries;
  const prefix = `${base}/`;
  return entries.filter((e) => normalizeTreePath(e.name).startsWith(prefix));
}

export type TreeLine = { depth: number; label: string; dir: boolean };

/** Girintili ağaç dökümü üretir (terminal `tree` komutu). */
export function treeAt(entries: VfsEntry[], dir = "", depth = 0): TreeLine[] {
  const { dirs, files } = childrenOf(entries, dir);
  const base = normalizeTreePath(dir);
  const out: TreeLine[] = [];
  for (const name of dirs) {
    out.push({ depth, label: `${name}/`, dir: true });
    out.push(...treeAt(entries, base ? `${base}/${name}` : name, depth + 1));
  }
  for (const file of files) out.push({ depth, label: baseName(file), dir: false });
  return out;
}
