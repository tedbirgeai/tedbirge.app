/**
 * GÖMÜLÜ OFİS BELGELERİ (Managed System Apps — veri katmanı)
 * ------------------------------------------------------------------
 * Yazı, Tablo, Sunu, Not ve Ajanda uygulamalarının tek veri kapısı.
 * Hiçbir uygulama doğrudan buluta veya harici servise yazmaz: bütün
 * belgeler cihazdaki şifreli sanal dosya sistemine (VFS) kaydedilir.
 *
 * Belge türü dosya uzantısından okunur; böylece "Dosyalar" penceresi
 * ve eşler arası aktarım aynı kayıtları görür, ayrı bir depo oluşmaz.
 */

import {
  listFiles,
  onVfsChange,
  readDocument,
  writeDocument,
  deleteFile,
  type VfsEntry,
} from "@/lib/vfs/store";
import { useCallback, useEffect, useState } from "react";

export type OfficeKind = "writer" | "sheets" | "slides" | "notes" | "organizer";

export type OfficeKindInfo = {
  /** Kullanıcıya görünen tür adı. */
  label: string;
  /** Dosya uzantısı (tür ayrımı bununla yapılır). */
  ext: string;
  /** VFS kaydında saklanan MIME türü. */
  mime: string;
  /** Yeni belgenin varsayılan adı. */
  defaultName: string;
  /** Yeni belgenin başlangıç içeriği. */
  empty: string;
};

export const OFFICE_KINDS: Record<OfficeKind, OfficeKindInfo> = {
  writer: {
    label: "Yazı belgesi",
    ext: ".tbw",
    mime: "text/markdown",
    defaultName: "Adsız belge",
    empty: "",
  },
  sheets: {
    label: "Hesap tablosu",
    ext: ".tbs",
    mime: "text/csv",
    defaultName: "Adsız tablo",
    empty: "",
  },
  slides: {
    label: "Sunu",
    ext: ".tbp",
    mime: "application/json",
    defaultName: "Adsız sunu",
    empty: JSON.stringify([{ title: "Başlık", body: "" }]),
  },
  notes: {
    label: "Not",
    ext: ".tbn",
    mime: "text/markdown",
    defaultName: "Yeni not",
    empty: "",
  },
  organizer: {
    label: "Ajanda",
    ext: ".tbo",
    mime: "application/json",
    defaultName: "Ajanda",
    empty: JSON.stringify([]),
  },
};

/** Dosya adının sonundaki uzantıyı tür bilgisiyle eşler. */
export function kindOf(name: string): OfficeKind | null {
  const lower = name.toLowerCase();
  for (const [kind, info] of Object.entries(OFFICE_KINDS) as [OfficeKind, OfficeKindInfo][]) {
    if (lower.endsWith(info.ext)) return kind;
  }
  return null;
}

/** Uzantısız görünen ad (arayüzde uzantı gösterilmez). */
export function displayName(name: string): string {
  const kind = kindOf(name);
  return kind ? name.slice(0, -OFFICE_KINDS[kind].ext.length) : name;
}

/** Kullanıcının yazdığı adı tür uzantısıyla tamamlar. */
export function fileNameFor(kind: OfficeKind, title: string): string {
  const info = OFFICE_KINDS[kind];
  const clean = title.trim() || info.defaultName;
  return clean.toLowerCase().endsWith(info.ext) ? clean : `${clean}${info.ext}`;
}

export type OfficeDoc = VfsEntry & { title: string };

/** Belirli türdeki belgeleri VFS'ten okur. */
export async function listDocs(kind: OfficeKind): Promise<OfficeDoc[]> {
  const files = await listFiles();
  return files
    .filter((f) => kindOf(f.name) === kind)
    .map((f) => ({ ...f, title: displayName(f.name) }));
}

/** Belgeyi kaydeder (id verilirse üzerine yazar). */
export function saveDoc(
  kind: OfficeKind,
  title: string,
  text: string,
  id?: string,
): Promise<VfsEntry> {
  return writeDocument({
    ...(id ? { id } : {}),
    name: fileNameFor(kind, title),
    mime: OFFICE_KINDS[kind].mime,
    text,
  });
}

export const openDoc = readDocument;
export const removeDoc = deleteFile;

/** Boş bir belge oluşturur (masaüstü "Yeni Oluştur" menüsü). */
export async function createDoc(kind: OfficeKind, title?: string): Promise<OfficeDoc> {
  const info = OFFICE_KINDS[kind];
  const name = title?.trim() || `${info.defaultName} ${new Date().toLocaleDateString("tr-TR")}`;
  const entry = await saveDoc(kind, name, info.empty);
  return { ...entry, title: displayName(entry.name) };
}

/* ------------------------------------------------------------------
 * Belge açma isteği: masaüstünden çift tıklanan belge, ilgili ofis
 * uygulaması açılır açılmaz (veya zaten açıksa anında) yüklenir.
 * ---------------------------------------------------------------- */
const OPEN_EVENT = "tedbirge:office-open";
const pendingOpen = new Map<OfficeKind, string>();

export function requestOpenDoc(kind: OfficeKind, id: string) {
  pendingOpen.set(kind, id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { kind, id } }));
  }
}

export function takeOpenDoc(kind: OfficeKind): string | null {
  const id = pendingOpen.get(kind) ?? null;
  pendingOpen.delete(kind);
  return id;
}

/** Açma isteklerini dinler (uygulama zaten açıkken de çalışır). */
export function onOpenDocRequest(kind: OfficeKind, fn: (id: string) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ kind: OfficeKind; id: string }>).detail;
    if (detail?.kind === kind) {
      pendingOpen.delete(kind);
      fn(detail.id);
    }
  };
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}

/** Tür listesini canlı izler; başka pencere yazdığında kendini tazeler. */
export function useOfficeDocs(kind: OfficeKind) {
  const [docs, setDocs] = useState<OfficeDoc[]>([]);
  const reload = useCallback(() => {
    void listDocs(kind).then(setDocs);
  }, [kind]);
  useEffect(() => {
    reload();
    return onVfsChange(reload);
  }, [reload]);
  return { docs, reload };
}
