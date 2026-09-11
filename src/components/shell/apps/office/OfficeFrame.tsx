/**
 * OFİS KABUĞU (ortak çerçeve)
 * ------------------------------------------------------------------
 * Writer, Sheets, Slides, Notes ve Organizer aynı kabuğu kullanır:
 * üstte belge adı + kaydet/yeni/sil, altında sekmeli şerit (ribbon),
 * solda belge kitaplığı, ortada uygulamaya özel yüzey, altta durum
 * çubuğu. Bütün okuma/yazma işleri şifreli VFS katmanına gider.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { FilePlus2, PanelLeftClose, PanelLeftOpen, Save, Trash2 } from "lucide-react";

import {
  OFFICE_KINDS,
  onOpenDocRequest,
  openDoc,
  removeDoc,
  saveDoc,
  takeOpenDoc,
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
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const latest = useRef({ id, title, text });
  latest.current = { id, title, text };

  const update = useCallback((next: string) => {
    setText(next);
    setDirty(true);
  }, []);

  /* Kullanici bilerek bos belge actiginda son belge geri yuklenmemeli. */
  const blankOnPurpose = useRef(false);

  const create = useCallback(() => {
    blankOnPurpose.current = true;
    setId(null);
    setTitle(info.defaultName);
    setText(info.empty);
    setDirty(false);
  }, [info]);

  const open = useCallback(
    async (docId: string, docTitle: string) => {
      blankOnPurpose.current = false;
      const body = await openDoc(docId);
      setId(docId);
      setTitle(docTitle);
      setText(body ?? info.empty);
      setDirty(false);
    },
    [info],
  );

  const save = useCallback(
    async (silent = false) => {
      const cur = latest.current;
      try {
        const entry = await saveDoc(kind, cur.title, cur.text, cur.id ?? undefined);
        setId(entry.id);
        setDirty(false);
        setSavedAt(Date.now());
        if (!silent) notifyOk("Belge cihazınıza kaydedildi.");
        reload();
      } catch {
        if (!silent) notifyError("Belge kaydedilemedi.");
      }
    },
    [kind, reload],
  );

  const destroy = useCallback(async () => {
    if (!id) return create();
    await removeDoc(id);
    create();
    reload();
  }, [id, create, reload]);

  /* Otomatik kaydetme: yazım durunca 1,2 saniye sonra sessizce yazar. */
  useEffect(() => {
    if (!dirty) return;
    const t = window.setTimeout(() => void save(true), 1200);
    return () => window.clearTimeout(t);
  }, [dirty, text, title, save]);

  /* Masaüstünden gelen "bu belgeyi aç" isteği. */
  useEffect(() => {
    const load = (docId: string) => {
      const doc = docs.find((d) => d.id === docId);
      void open(docId, doc?.title ?? info.defaultName);
    };
    const pending = takeOpenDoc(kind);
    if (pending) load(pending);
    return onOpenDocRequest(kind, load);
  }, [kind, docs, open, info]);

  /* İlk açılışta son belge gelir; hiç belge yoksa boş belge açılır. */
  useEffect(() => {
    if (id !== null || dirty || blankOnPurpose.current) return;
    const first = docs[0];
    if (first) void open(first.id, first.title);
  }, [docs, id, dirty, open]);

  return {
    docs,
    id,
    title,
    setTitle: (t: string) => {
      setTitle(t);
      setDirty(true);
    },
    text,
    setText: update,
    dirty,
    savedAt,
    create,
    open,
    save: () => void save(false),
    destroy,
  };
}

export type OfficeEditor = ReturnType<typeof useOfficeEditor>;

export type RibbonTab = { id: string; label: string; content: ReactNode };

export function OfficeShell({
  kind,
  editor,
  tabs,
  children,
  status,
  sidebar = true,
}: {
  kind: OfficeKind;
  editor: OfficeEditor;
  tabs?: RibbonTab[];
  children: ReactNode;
  status?: ReactNode;
  sidebar?: boolean;
}) {
  const info = OFFICE_KINDS[kind];
  const [tab, setTab] = useState(tabs?.[0]?.id ?? "");
  const [showLibrary, setShowLibrary] = useState(sidebar);
  const active = tabs?.find((t) => t.id === tab) ?? tabs?.[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[color-mix(in_srgb,var(--tb-bg)_60%,transparent)]">
      {/* Başlık şeridi */}
      <div
        className="flex flex-wrap items-center gap-2 border-b px-2 py-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <button
          type="button"
          aria-label={showLibrary ? "Kitaplığı gizle" : "Kitaplığı göster"}
          onClick={() => setShowLibrary((v) => !v)}
          className="wa-press hidden h-8 w-8 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)] sm:grid"
        >
          {showLibrary ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
        <input
          value={editor.title}
          onChange={(e) => editor.setTitle(e.target.value)}
          aria-label="Belge adı"
          className="min-w-0 flex-1 rounded-lg bg-[color-mix(in_srgb,var(--tb-text)_6%,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--tb-text)] outline-none focus:ring-1 focus:ring-[var(--tb-accent)]"
          style={{ border: "1px solid var(--border)" }}
        />
        <ToolButton onClick={editor.create} icon={<FilePlus2 className="h-4 w-4" />} label="Yeni" />
        <ToolButton onClick={editor.save} icon={<Save className="h-4 w-4" />} label="Kaydet" />
        <ToolButton
          onClick={() => void editor.destroy()}
          icon={<Trash2 className="h-4 w-4" />}
          label="Sil"
        />
      </div>

      {/* Şerit (ribbon) */}
      {tabs && tabs.length > 0 ? (
        <div className="border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-1 px-2 pt-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-t-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  (active?.id ?? "") === t.id
                    ? "bg-[color-mix(in_srgb,var(--tb-accent)_16%,transparent)] text-[var(--tb-text)]"
                    : "text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-2 py-2">{active?.content}</div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {showLibrary ? (
          <aside
            className="hidden w-52 shrink-0 overflow-y-auto border-r p-2 sm:block"
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
                    ? "bg-[color-mix(in_srgb,var(--tb-accent)_18%,transparent)] text-[var(--tb-text)]"
                    : "text-[var(--tb-muted)] hover:bg-[color-mix(in_srgb,var(--tb-text)_6%,transparent)]"
                }`}
              >
                {d.title}
              </button>
            ))}
          </aside>
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>

      <div
        className="flex items-center gap-3 border-t px-3 py-1.5 font-osmono text-[11px] text-[var(--tb-muted)]"
        style={{ borderColor: "var(--border)" }}
      >
        <span>{editor.dirty ? "Kaydediliyor…" : editor.savedAt ? "Kaydedildi" : "Hazır"}</span>
        {status}
        <span className="ml-auto">Çevrimdışı · şifreli cihaz deposu</span>
      </div>
    </div>
  );
}

/** Eski çağrı yerleri için ince sarmalayıcı. */
export function OfficeFrame(props: {
  kind: OfficeKind;
  editor: OfficeEditor;
  children: ReactNode;
  toolbar?: ReactNode;
}) {
  return (
    <OfficeShell
      kind={props.kind}
      editor={props.editor}
      {...(props.toolbar
        ? { tabs: [{ id: "giris", label: "Giriş", content: props.toolbar }] }
        : {})}
    >
      {props.children}
    </OfficeShell>
  );
}

export function ToolButton({
  onClick,
  icon,
  label,
  active,
  title,
  ...rest
}: {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
  active?: boolean;
  title?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "title">) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title ?? label}
      aria-label={title ?? label}
      aria-pressed={active}
      className={`wa-press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] transition-colors ${
        active
          ? "bg-[color-mix(in_srgb,var(--tb-accent)_20%,transparent)] text-[var(--tb-text)]"
          : "text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-text)_8%,transparent)]"
      }`}
      style={{ border: "1px solid var(--border)" }}
      {...rest}
    >
      {icon}
      {label}
    </button>
  );
}

/** Şerit içindeki mantıksal grup. */
export function RibbonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2 py-1"
      style={{ border: "1px solid var(--border)" }}
    >
      <span className="font-osmono text-[10px] tracking-wide text-[var(--tb-muted)] uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}
