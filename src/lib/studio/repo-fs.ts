/**
 * /repo dosya erişimi — yalnız `repo.write` sistem yeteneği ile yazılır.
 */

import { deleteFile, listFiles, readDocument, writeDocument } from "@/lib/vfs/store";
import { withMountLock, REPO_FOLDER } from "@/lib/limen/mount";
import { resolveRepoPath } from "@/lib/vfs/sandbox";

export const STUDIO_APP_ID = "studio";
const MAX_FILE_BYTES = 256 * 1024;

const idOf = (rel: string) => `${REPO_FOLDER}:${rel}`;

/** "/repo/a/b" veya "a/b" → "a/b" (doğrulanmış). */
export function repoRel(path: string, appId = STUDIO_APP_ID): string {
  return resolveRepoPath(appId, path).slice("/repo/".length);
}

function mimeOf(path: string): string {
  if (path.endsWith(".json") || path.endsWith(".tbapp")) return "application/json";
  if (path.endsWith(".md")) return "text/markdown";
  if (path.endsWith(".ts")) return "text/plain";
  return "text/plain";
}

export async function listRepo(): Promise<string[]> {
  const all = await listFiles();
  return all
    .filter((e) => e.folder === REPO_FOLDER)
    .map((e) => e.name)
    .sort();
}

export async function readRepo(path: string): Promise<string | null> {
  return readDocument(idOf(repoRel(path)));
}

export async function writeRepo(path: string, text: string, appId = STUDIO_APP_ID): Promise<void> {
  const rel = repoRel(path, appId);
  if (new Blob([text]).size > MAX_FILE_BYTES) throw new Error("Dosya 256 KB sınırını aşıyor.");
  await withMountLock(async () => {
    await writeDocument({ id: idOf(rel), name: rel, mime: mimeOf(rel), text, folder: REPO_FOLDER });
  });
}

export async function removeRepo(path: string, appId = STUDIO_APP_ID): Promise<void> {
  const rel = repoRel(path, appId);
  await withMountLock(() => deleteFile(idOf(rel)));
}

/** Proje kökleri: tbapp.json içeren dizinler. */
export function projectsOf(paths: readonly string[]): string[] {
  return [...new Set(paths.filter((p) => /^[^/]+\/tbapp\.json$/.test(p)).map((p) => p.split("/")[0] as string))];
}
