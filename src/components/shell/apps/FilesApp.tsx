/**
 * DOSYALAR — tOS dosya yöneticisi
 * ------------------------------------------------------------------
 * Sol tarafta dizin ağacı, üstte arama, ortada liste ve sağda seçili
 * dosyanın önizleme/detay paneli. Tüm veri cihazdaki sanal dosya
 * sisteminde (IndexedDB) kalır; buluta hiçbir kopya çıkmaz.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileUp, FolderOpen, Loader2, Pencil, Search, Send, Trash2 } from "lucide-react";

import { WindowEmpty } from "@/components/shell/WindowShell";
import { ConfirmDialog } from "@/components/shell/ConfirmDialog";
import { pushUndo } from "@/lib/shell/undo-stack";
import { useShell } from "@/shell/shell-context";
import { sendFileToPeer } from "@/lib/p2p/file-transfer";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import {
  deleteFile,
  listFiles,
  moveFile,
  objectUrl,
  onVfsChange,
  readFile,
  releaseUrls,
  renameFile,
  saveFiles,
  VFS_FOLDERS,
  type VfsEntry,
  type VfsFolder,
} from "@/lib/vfs/store";

function human(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

const btn =
  "wa-press inline-flex items-center gap-1.5 rounded-lg border border-[var(--tb-border)] px-2.5 py-1.5 font-osmono text-[11px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]";

/** Seçili dosyanın önizlemesi: görsel, ses, video ya da düz metin. */
function Preview({ entry }: { entry: VfsEntry }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    setText(null);
    if (entry.mime.startsWith("text/") || entry.mime === "application/json") {
      void readFile(entry.id).then(async (f) => {
        if (!f || !alive) return;
        setText((await f.text()).slice(0, 4000));
      });
    } else {
      void objectUrl(entry.id, "files").then((u) => {
        if (alive) setUrl(u);
      });
    }
    return () => {
      alive = false;
    };
  }, [entry.id, entry.mime]);

  if (text != null) {
    return (
      <pre className="max-h-56 overflow-auto rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-2 font-osmono text-[11px] whitespace-pre-wrap text-[var(--tb-text)]">
        {text}
      </pre>
    );
  }
  if (!url) {
    return <p className="font-osmono text-[11px] text-[var(--tb-muted)]">Önizleme hazırlanıyor…</p>;
  }
  if (entry.mime.startsWith("image/")) {
    return <img src={url} alt={entry.name} className="max-h-56 w-full rounded-xl object-contain" />;
  }
  if (entry.mime.startsWith("video/")) {
    return <video src={url} controls className="max-h-56 w-full rounded-xl" />;
  }
  if (entry.mime.startsWith("audio/")) {
    return <audio src={url} controls className="w-full" />;
  }
  return (
    <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
      Bu tür için önizleme yok; dosyayı indirebilirsiniz.
    </p>
  );
}

export function FilesApp({ onTransfer }: { onTransfer?: () => void }) {
  const { node } = useShell();
  const peers = node.peers.filter((p) => p.direct);
  const [files, setFiles] = useState<VfsEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [target, setTarget] = useState("");
  const [folder, setFolder] = useState<VfsFolder>("Belgeler");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listFiles()
      .then(setFiles)
      .catch((e: unknown) =>
        notifyError("Depo okunamadı", e instanceof Error ? e.message : undefined),
      );
  }, []);

  useEffect(() => {
    refresh();
    const off = onVfsChange(refresh);
    return () => {
      off();
      // Yalnız Dosyalar penceresinin kendi önizleme bağlantıları düşer;
      // Müzik/Medya'nın kullandığı bağlantılara dokunulmaz.
      releaseUrls("files");
    };
  }, [refresh]);

  useEffect(() => {
    if (!target && peers[0]) setTarget(peers[0].nodeId);
  }, [peers, target]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) map.set(f.folder, (map.get(f.folder) ?? 0) + 1);
    return map;
  }, [files]);

  const visible = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return files
      .filter((f) => (needle ? true : f.folder === folder))
      .filter((f) => (needle ? f.name.toLocaleLowerCase("tr").includes(needle) : true));
  }, [files, folder, q]);

  const current = visible.find((f) => f.id === selected) ?? null;

  const add = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setBusy(true);
      try {
        const saved = await saveFiles([...list], folder);
        notifyOk("Dosya eklendi", `${saved.length} dosya · ${folder}`);
      } catch (e) {
        notifyError("Dosya kaydedilemedi", e instanceof Error ? e.message : undefined);
      } finally {
        setBusy(false);
      }
    },
    [folder],
  );

  const download = useCallback(async (entry: VfsEntry) => {
    const url = await objectUrl(entry.id);
    if (!url) return notifyError("Dosya açılamadı", entry.name);
    const a = document.createElement("a");
    a.href = url;
    a.download = entry.name;
    a.click();
  }, []);

  const send = useCallback(
    async (entry: VfsEntry) => {
      const peer = target || peers[0]?.nodeId;
      if (!peer) return notifyError("Bağlı cihaz yok", "Önce bir cihazla eşleşin.");
      const file = await readFile(entry.id);
      if (!file) return notifyError("Dosya okunamadı", entry.name);
      try {
        await sendFileToPeer(peer, file);
        notifyOk("Gönderildi", entry.name);
      } catch (e) {
        notifyError("Gönderim başarısız", e instanceof Error ? e.message : undefined);
      }
    },
    [target, peers],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void add(e.dataTransfer.files);
      }}
      className={`flex min-h-0 flex-1 flex-col ${
        over ? "outline-2 outline-dashed outline-[var(--tb-accent)]" : ""
      }`}
    >
      {/* Araç şeridi */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--tb-border)] p-3">
        <label className="wa-press flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-[var(--tb-accent)] px-3 text-[12px] font-semibold text-[var(--tb-accent)]">
          <FolderOpen className="h-4 w-4" aria-hidden /> Dosya ekle
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void add(e.target.files)}
          />
        </label>

        <label className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--tb-border)] px-3">
          <Search className="h-3.5 w-3.5 shrink-0 text-[var(--tb-muted)]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Dosya ara"
            aria-label="Dosya ara"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--tb-text)] outline-none"
          />
        </label>

        {peers.length > 0 ? (
          <label className="flex min-h-9 items-center gap-2 rounded-full border border-[var(--tb-border)] px-3 font-osmono text-[11px] text-[var(--tb-muted)]">
            Hedef
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Hedef cihaz"
              className="bg-transparent text-[var(--tb-text)] outline-none"
            >
              {peers.map((p) => (
                <option key={p.nodeId} value={p.nodeId}>
                  {p.nodeId.slice(0, 10)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {onTransfer ? (
          <button type="button" onClick={onTransfer} className={btn}>
            <FileUp className="h-4 w-4" aria-hidden /> Aktarımlar
          </button>
        ) : null}

        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--tb-muted)]" aria-hidden />
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)]">
        {/* Dizin ağacı */}
        <nav className="shrink-0 border-b border-[var(--tb-border)] p-2 sm:border-r sm:border-b-0">
          <ul className="flex gap-1.5 overflow-x-auto sm:block sm:space-y-1 sm:overflow-visible">
            {VFS_FOLDERS.map((f) => (
              <li key={f}>
                <button
                  type="button"
                  onClick={() => {
                    setFolder(f);
                    setQ("");
                  }}
                  aria-pressed={folder === f && !q}
                  className={`wa-press w-full shrink-0 rounded-lg px-2.5 py-1.5 text-left text-[12px] whitespace-nowrap ${
                    folder === f && !q
                      ? "bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                      : "text-[var(--tb-muted)]"
                  }`}
                >
                  {f}
                  <span className="ml-1.5 font-osmono text-[10px] opacity-70">
                    {counts.get(f) ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Liste + detay */}
        <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto]">
          <ul className="min-h-0 overflow-y-auto">
            {visible.map((f) => (
              <li
                key={f.id}
                draggable
                onDragStart={(e) => {
                  // Uygulamalar arası aktarım: Sohbet veya Medya penceresine bırakılabilir.
                  e.dataTransfer.setData(
                    "application/x-tedbirge-file",
                    JSON.stringify({ id: f.id, name: f.name, mime: f.mime }),
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => setSelected(f.id === selected ? null : f.id)}
                className={`flex min-h-12 cursor-grab items-center gap-3 border-b border-[var(--tb-border)] px-3 active:cursor-grabbing ${
                  selected === f.id ? "bg-[color-mix(in_srgb,var(--tb-accent)_8%,transparent)]" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-[var(--tb-text)]">{f.name}</span>
                  <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">
                    {human(f.size)} · {f.folder}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void send(f);
                  }}
                  aria-label={`${f.name} eşe gönder`}
                  className="wa-press grid h-9 w-9 place-items-center rounded-full text-[var(--tb-accent)]"
                >
                  <Send className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void download(f);
                  }}
                  aria-label={`${f.name} indir`}
                  className="wa-press grid h-9 w-9 place-items-center rounded-full text-[var(--tb-muted)]"
                >
                  <Download className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
            {visible.length === 0 ? (
              <li className="p-4">
                <WindowEmpty
                  title={q ? "Eşleşen dosya yok" : "Bu klasör boş"}
                  hint="Dosyaları bu pencereye sürükleyin; veriler cihazda kalır. Kayıtlı bir dosyayı Sohbet veya Medya penceresine sürükleyerek gönderebilirsiniz."
                />
              </li>
            ) : null}
          </ul>

          {current ? (
            <aside className="shrink-0 border-t border-[var(--tb-border)] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[13px] font-semibold text-[var(--tb-text)]">
                  {current.name}
                </p>
                <span className="shrink-0 font-osmono text-[11px] text-[var(--tb-muted)]">
                  {human(current.size)}
                </span>
              </div>

              <div className="mt-2">
                <Preview entry={current} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    const name = window.prompt("Yeni ad", current.name);
                    if (name && name.trim() !== current.name) {
                      void renameFile(current.id, name).then(() =>
                        notifyOk("Yeniden adlandırıldı"),
                      );
                    }
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Yeniden adlandır
                </button>

                <label className={btn}>
                  Klasör
                  <select
                    value={current.folder}
                    aria-label="Klasöre taşı"
                    onChange={(e) => {
                      void moveFile(current.id, e.target.value as VfsFolder).then(() =>
                        notifyOk("Taşındı", e.target.value),
                      );
                    }}
                    className="bg-transparent text-[var(--tb-text)] outline-none"
                  >
                    {VFS_FOLDERS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>

                <button type="button" className={btn} onClick={() => void download(current)}>
                  <Download className="h-3.5 w-3.5" aria-hidden /> Dışa aktar
                </button>

                <button type="button" className={btn} onClick={() => setConfirmDelete(current.id)}>
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Sil
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      {/* Nielsen #5: yıkıcı işlem iki aşamalı onay + geri alma ile korunur. */}
      <ConfirmDialog
        open={confirmDelete != null}
        title="Dosya silinsin mi?"
        description="Dosya cihazdaki sanal dosya sisteminden kaldırılacak. Silme işlemini Ctrl + Z ile geri alabilirsiniz."
        confirmLabel="Sil"
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          const id = confirmDelete;
          if (!id) return;
          const entry = files.find((f) => f.id === id);
          void readFile(id).then(async (file) => {
            await deleteFile(id);
            setSelected(null);
            notifyOk("Silindi", entry?.name ?? "Dosya");
            if (file) {
              pushUndo({
                label: `${entry?.name ?? "Dosya"} silindi`,
                undo: async () => {
                  await saveFiles([file]);
                },
              });
            }
          });
        }}
      />
    </div>
  );
}
