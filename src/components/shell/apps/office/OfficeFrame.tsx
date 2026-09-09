/**
 * OFİS ÇERÇEVESİ (ortak kabuk)
 * ------------------------------------------------------------------
 * Yazı, Tablo, Sunu, Not ve Ajanda uygulamaları aynı çerçeveyi
 * kullanır: solda belge listesi, üstte ad + kaydet/sil düğmeleri,
 * ortada uygulamaya özel düzenleyici. Bütün okuma/yazma işleri
 * `@/lib/office/documents` üzerinden şifreli VFS katmanına gider.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { FilePlus2, Save, Trash2 } from "lucide-react";

import {
  OFFICE_KINDS,
  openDoc,
  removeDoc,
  saveDoc,
  useOfficeDocs,
  type OfficeKind,
} from "@/lib/office/documents";
import { notifyError, notifyOk } from "@/lib/shell/notify";

export function useOfficeEditor(kind: OfficeKind) {
  const info = OFFICE_KINDS[kind];
  const { docs, reload } = useOfficeDocs(kind);
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState(info.defaultName);
  const [text, setText] = useState(info.empty);
  const [dirty, setDirty] = useState(false);

  const update = useCallback((next: string) => {
    setText(next);
    setDirty(true);
  }, []);

  const create = useCallback(() => {
    setId(null);
    setTitle(info.defaultName);
    setText(info.empty);
    setDirty(false);
  }, [info]);

  const open = useCallback(
    async (docId: string, docTitle: string) => {
      const body = await openDoc(docId);
      setId(docId);
      setTitle(docTitle);
      setText(body ?? info.empty);
      setDirty(false);
    },
    [info],
  );

  const save = useCallback(async () => {
    try {
      const entry = await saveDoc(kind, title, text, id ?? undefined);
      setId(entry.id);
      setDirty(false);
      notifyOk("Belge cihazınıza kaydedildi.");
      reload();
    } catch {
      notifyError("Belge kaydedilemedi.");
    }
  }, [kind, title, text, id, reload]);

  const destroy = useCallback(async () => {
    if (!id) return create();
    await removeDoc(id);
    create();
    reload();
  }, [id, create, reload]);

  // İlk açılışta son belgeyi getirir; hiç belge yoksa boş belge açılır.
  useEffect(() => {
    if (id !== null || dirty) return;
    const first = docs[0];
    if (first) void open(first.id, first.title);
  }, [docs, id, dirty, open]);

  return { docs, id, title, setTitle, text, setText: update, dirty, create, open, save, destroy };
}

export function OfficeFrame({
  kind,
  editor,
  children,
  toolbar,
}: {
  kind: OfficeKind;
  editor: ReturnType<typeof useOfficeEditor>;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  const info = OFFICE_KINDS[kind];
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex flex-wrap items-center gap-2 border-b p-2"
        style={{ borderColor: "var(--border)" }}
      >
        <input
          value={editor.title}
          onChange={(e) => editor.setTitle(e.target.value)}
          aria-label="Belge adı"
          className="min-w-0 flex-1 rounded-lg bg-black/20 px-3 py-1.5 text-sm text-[var(--tb-text)] outline-none"
          style={{ border: "1px solid var(--border)" }}
        />
        {toolbar}
        <ToolButton onClick={editor.create} icon={<FilePlus2 className="h-4 w-4" />} label="Yeni" />
        <ToolButton
          onClick={() => void editor.save()}
          icon={<Save className="h-4 w-4" />}
          label={editor.dirty ? "Kaydet •" : "Kaydet"}
        />
        <ToolButton
          onClick={() => void editor.destroy()}
          icon={<Trash2 className="h-4 w-4" />}
          label="Sil"
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden w-48 shrink-0 overflow-y-auto border-r p-2 sm:block"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="px-1 pb-2 font-osmono text-[11px] tracking-wide text-[var(--tb-muted)] uppercase">
            {info.label}
          </p>
          {editor.docs.length === 0 && (
            <p className="px-1 text-[12px] text-[var(--tb-muted)]">Henüz belge yok.</p>
          )}
          {editor.docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => void editor.open(d.id, d.title)}
              className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] ${
                d.id === editor.id
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-[var(--tb-text)] hover:bg-white/5"
              }`}
            >
              {d.title}
            </button>
          ))}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export function ToolButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon?: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wa-press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--tb-text)] hover:bg-white/5"
      style={{ border: "1px solid var(--border)" }}
    >
      {icon}
      {label}
    </button>
  );
}
