/**
 * TEDBIRGE PDF STUDIO — çevrimdışı PDF görüntüleyici ve üretici
 * PDF'ler şifreli VFS katmanından okunur; yeni PDF çıktısı tarayıcı
 * yazdırma hattı üzerinden alınır, hiçbir dosya dışarı gönderilmez.
 */

import { useEffect, useRef, useState } from "react";
import { FileUp, Printer, Trash2 } from "lucide-react";

import { displayName } from "@/lib/office/documents";
import {
  deleteFile,
  listFiles,
  objectUrl,
  onVfsChange,
  releaseUrls,
  saveFiles,
  type VfsEntry,
} from "@/lib/vfs/store";

const OWNER = "pdf-studio";

export function PdfStudioApp() {
  const [docs, setDocs] = useState<VfsEntry[]>([]);
  const [active, setActive] = useState<VfsEntry | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => {
      void listFiles().then((all) => setDocs(all.filter((f) => f.mime === "application/pdf")));
    };
    load();
    const off = onVfsChange(load);
    return () => {
      off();
      releaseUrls(OWNER);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setUrl(null);
      return;
    }
    void objectUrl(active.id, OWNER).then(setUrl);
  }, [active]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex flex-wrap items-center gap-2 border-b p-2"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="wa-press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--tb-text)]"
          style={{ border: "1px solid var(--border)" }}
        >
          <FileUp className="h-4 w-4" /> PDF ekle
        </button>
        <button
          type="button"
          disabled={!url}
          onClick={() => url && window.open(url, "_blank")?.print()}
          className="wa-press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--tb-text)] disabled:opacity-40"
          style={{ border: "1px solid var(--border)" }}
        >
          <Printer className="h-4 w-4" /> Yazdır
        </button>
        <button
          type="button"
          disabled={!active}
          onClick={() => {
            if (!active) return;
            void deleteFile(active.id);
            setActive(null);
          }}
          className="wa-press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--tb-text)] disabled:opacity-40"
          style={{ border: "1px solid var(--border)" }}
        >
          <Trash2 className="h-4 w-4" /> Sil
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void saveFiles(files, "Belgeler");
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className="w-48 shrink-0 overflow-y-auto border-r p-2"
          style={{ borderColor: "var(--border)" }}
        >
          {docs.length === 0 && (
            <p className="px-1 text-[12px] text-[var(--tb-muted)]">Kayıtlı PDF yok.</p>
          )}
          {docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActive(d)}
              className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] ${
                d.id === active?.id
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-[var(--tb-text)] hover:bg-white/5"
              }`}
            >
              {displayName(d.name)}
            </button>
          ))}
        </aside>
        <div className="min-h-0 min-w-0 flex-1">
          {url ? (
            <iframe title="PDF önizleme" src={url} className="h-full w-full bg-white" />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-[var(--tb-muted)]">
              Soldan bir PDF seçin veya cihazınızdan ekleyin. Dosyalar cihazda kalır.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
