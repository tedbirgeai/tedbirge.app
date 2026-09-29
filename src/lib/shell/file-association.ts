/**
 * DOSYA TÜRÜ İLİŞKİLENDİRME (File Association)
 * ------------------------------------------------------------------
 * Bir VFS kaydının hangi yerleşik uygulamada açılacağının tek doğruluk
 * kaynağı. Masaüstü, Dosyalar penceresi ve Spotlight aynı eşlemeyi
 * kullanır; hiçbir dosya yeni tarayıcı sekmesine yönlendirilmez.
 */

import { kindOf, requestOpenDoc, type OfficeKind } from "@/lib/office/documents";
import type { VfsEntry } from "@/lib/vfs/store";

export const FOLDER_MIME = "application/x-tedbirge-folder";

/** Ofis belge türünün açılacağı uygulama. */
export const KIND_APP: Record<OfficeKind, string> = {
  writer: "writer",
  sheets: "sheets",
  slides: "slides",
  notes: "notes",
  organizer: "organizer",
};

/** Uzantı tabanlı eşleme: düz metin ve tablo/veri dosyaları. */
const EXT_KIND: Array<[string, OfficeKind]> = [
  [".txt", "notes"],
  [".md", "notes"],
  [".markdown", "notes"],
  [".csv", "sheets"],
  [".tsv", "sheets"],
  [".xlsx", "sheets"],
];

export type Association = {
  /** Açılacak uygulamanın katalog kimliği. */
  app: string;
  /** Uygulama açılırken yüklenecek ofis belge türü (varsa). */
  kind?: OfficeKind;
};

/** Kayda karşılık gelen uygulamayı bulur; eşleşme yoksa null döner. */
export function associationFor(entry: VfsEntry): Association | null {
  if (entry.mime === FOLDER_MIME) return { app: "files" };
  if (entry.mime === "application/pdf") return { app: "pdf" };

  const kind = kindOf(entry.name);
  if (kind) return { app: KIND_APP[kind], kind };

  const lower = entry.name.toLocaleLowerCase("tr");
  const byExt = EXT_KIND.find(([ext]) => lower.endsWith(ext));
  if (byExt) return { app: KIND_APP[byExt[1]], kind: byExt[1] };

  if (entry.mime.startsWith("image/")) return { app: "media" };
  if (entry.mime.startsWith("video/")) return { app: "media" };
  if (entry.mime.startsWith("audio/")) return { app: "music" };
  if (entry.mime.startsWith("text/")) return { app: "notes", kind: "notes" };
  return null;
}

/**
 * Kaydı ilişkili uygulamada açar. Uygulamayı açma işi kabuğa aittir;
 * bu yüzden `launch` geri çağrısı dışarıdan verilir.
 */
export function openWithAssociation(entry: VfsEntry, launch: (app: string) => void): boolean {
  const assoc = associationFor(entry);
  if (!assoc) return false;
  if (assoc.kind) requestOpenDoc(assoc.kind, entry.id);
  launch(assoc.app);
  return true;
}
