/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

/**
 * LIMEN → VFS MOUNT KATMANI
 * ------------------------------------------------------------------
 * LIMEN'de kuyruğa alınan (veya eşlerden gelen) paketleri yerel depodaki
 * "repo" kök klasörüne fiziksel dosya ağacı olarak yazar. Yazım
 * idempotenttir: aynı yol yeniden mount edilince kopya çoğalmaz, kayıt
 * güncellenir. Ağa hiçbir istek çıkmaz.
 */

import { writeDocument, type VfsEntry } from "@/lib/vfs/store";
import { childrenOf, entriesUnder } from "@/lib/vfs/tree";

import type { LimenRecord } from "@/lib/limen/sync";

export const REPO_FOLDER = "repo" as const;

export type LimenMount = {
  /** Kayıt kimliği (repo:...). */
  id: string;
  /** Depo içindeki yol: repo/<slug> */
  path: string;
  /** Mount edilen dosya sayısı. */
  files: number;
};

/** Çalışma alanı adını dosya sistemi güvenli bir dizin adına çevirir. */
export function slugOf(name: string): string {
  // Dizin adı için Türkçe'ye özgü küçültme kullanılmaz: "AXIOM" → "axiom".
  const base = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return base || "workspace";
}

function manifest(record: LimenRecord, slug: string): string {
  return JSON.stringify(
    {
      format: "limen-mount",
      version: 1,
      id: record.id,
      name: record.name,
      slug,
      branch: record.branch,
      mode: record.mode,
      status: record.status,
      updatedAt: record.updatedAt,
    },
    null,
    2,
  );
}

/**
 * Bir LIMEN kaydını depoya mount eder.
 * Üretilen ağaç:
 *   repo/<slug>/limen.json        → paket bildirimi
 *   repo/<slug>/src/BRANCH        → etkin dal
 *   repo/<slug>/delta/<alan>.txt  → delta alanları
 */
export async function mountLimenRecord(record: LimenRecord): Promise<LimenMount> {
  const slug = slugOf(record.name);
  const root = `${slug}`;
  const files: Array<{ path: string; mime: string; text: string }> = [
    { path: `${root}/limen.json`, mime: "application/json", text: manifest(record, slug) },
    { path: `${root}/src/BRANCH`, mime: "text/plain", text: `${record.branch}\n` },
    {
      path: `${root}/delta/durum.txt`,
      mime: "text/plain",
      text: [
        `kayit    : ${record.id}`,
        `ad       : ${record.name}`,
        `dal      : ${record.branch}`,
        `ayna     : ${record.mode}`,
        `durum    : ${record.status}`,
        `guncelle : ${new Date(record.updatedAt).toISOString()}`,
        "",
      ].join("\n"),
    },
  ];

  for (const file of files) {
    await writeDocument({
      // Sabit kimlik → aynı yol yeniden yazıldığında kopya oluşmaz.
      id: `${REPO_FOLDER}:${file.path}`,
      name: file.path,
      mime: file.mime,
      text: file.text,
      folder: REPO_FOLDER,
    });
  }

  return { id: record.id, path: `${REPO_FOLDER}/${root}`, files: files.length };
}

/** Depoda mount edilmiş paketlerin özeti (dizin adı → dosya sayısı). */
export function mountedTree(entries: VfsEntry[]): Array<{ slug: string; files: number }> {
  const repo = entries.filter((e) => e.folder === REPO_FOLDER);
  return childrenOf(repo).dirs.map((slug) => ({
    slug,
    files: entriesUnder(repo, slug).length,
  }));
}
