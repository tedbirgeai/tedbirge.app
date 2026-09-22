/**
 * KOTA KORUMASI VE ANLIK GÖRÜNTÜ BİRLEŞTİRME (Compaction)
 * ------------------------------------------------------------------
 * Proje kökü (`repo`) altındaki delta kayıtları zamanla birikir. Bu modül
 * aynı delta dizinindeki eski kayıtları en güncel anlık görüntüye indirir
 * ve depo dolmaya başladığında yalnız bu türev kayıtları budar.
 *
 * Kullanıcının kendi dosyaları (Belgeler, Görseller, Medya, İndirilenler)
 * hiçbir koşulda silinmez. Tüm yazımlar montaj kilidi altında yürür.
 */

import { REPO_FOLDER, withMountLock } from "@/lib/limen/mount";
import { deleteFile, listFiles, storageUsage, type VfsEntry } from "@/lib/vfs/store";
import { dirOf } from "@/lib/vfs/tree";

/** Depo doluluk oranı bu eşiği aşınca budama devreye girer. */
export const COMPACT_RATIO = 0.85;

/** Bir delta dizininde saklanan en güncel anlık görüntü sayısı. */
export const KEEP_SNAPSHOTS = 3;

export type CompactionPlan = {
  /** Korunan kayıt kimlikleri. */
  keep: string[];
  /** Birleştirme sonucu düşen (eski) kayıt kimlikleri. */
  drop: string[];
};

/** Kayıt, proje kökündeki bir delta anlık görüntüsü mü? */
function isDeltaSnapshot(entry: VfsEntry): boolean {
  if (entry.folder !== REPO_FOLDER) return false;
  const dir = dirOf(entry);
  return dir === "delta" || dir.endsWith("/delta");
}

/**
 * Birleştirme planı. Yalnız proje kökündeki delta kayıtları gruplanır;
 * her dizinde en güncel `KEEP_SNAPSHOTS` kayıt kalır, gerisi düşer.
 * Kullanıcı klasörleri plana hiç girmez.
 */
export function planCompaction(entries: VfsEntry[], keep = KEEP_SNAPSHOTS): CompactionPlan {
  const groups = new Map<string, VfsEntry[]>();
  for (const entry of entries) {
    if (!isDeltaSnapshot(entry)) continue;
    const dir = dirOf(entry);
    const list = groups.get(dir) ?? [];
    list.push(entry);
    groups.set(dir, list);
  }
  const plan: CompactionPlan = { keep: [], drop: [] };
  for (const list of groups.values()) {
    const sorted = [...list].sort((a, b) => b.at - a.at);
    sorted.forEach((entry, i) => {
      if (i < Math.max(1, keep)) plan.keep.push(entry.id);
      else plan.drop.push(entry.id);
    });
  }
  return plan;
}

/** Kota baskısı var mı? (kota okunamıyorsa baskı yok sayılır) */
export function quotaPressure(usage: { bytes: number; quota: number | null }): boolean {
  if (!usage.quota || usage.quota <= 0) return false;
  return usage.bytes / usage.quota > COMPACT_RATIO;
}

export type CompactionResult = { removed: number; reason: "none" | "quota" | "routine" };

/**
 * Birleştirmeyi çalıştırır. Kota baskısı varsa tek anlık görüntüye kadar
 * iner; yoksa rutin olarak son üç görüntüyü korur.
 */
export async function compactRepo(): Promise<CompactionResult> {
  return withMountLock(async () => {
    const [entries, usage] = await Promise.all([listFiles(), storageUsage()]);
    const pressure = quotaPressure(usage);
    const plan = planCompaction(entries, pressure ? 1 : KEEP_SNAPSHOTS);
    let removed = 0;
    for (const id of plan.drop) {
      try {
        await deleteFile(id);
        removed += 1;
      } catch {
        /* kayıt başkası tarafından silinmiş olabilir */
      }
    }
    return { removed, reason: pressure ? "quota" : "routine" };
  });
}
