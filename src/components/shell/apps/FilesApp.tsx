/**
 * DOSYALAR — tOS dosya yöneticisi
 * ------------------------------------------------------------------
 * Sürükle-bırak ile eklenen dosyalar cihazdaki sanal dosya sisteminde
 * (IndexedDB) kalıcı saklanır; pencere kapansa da liste korunur.
 * Dosyalar buluta çıkmaz, yalnız seçilen eşe şifreli kanaldan gider.
 */

import { useCallback, useEffect, useState } from "react";
import { Download, FileUp, FolderOpen, Loader2, Send, Trash2 } from "lucide-react";

import { useShell } from "@/shell/ShellProvider";
import { sendFileToPeer } from "@/lib/p2p/file-transfer";
import {
  deleteFile,
  listFiles,
  objectUrl,
  onVfsChange,
  readFile,
  releaseUrls,
  saveFiles,
  type VfsEntry,
} from "@/lib/vfs/store";

function human(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function FilesApp({ onTransfer }: { onTransfer?: () => void }) {
  const { node } = useShell();
  const peers = node.peers.filter((p) => p.direct);
  const [files, setFiles] = useState<VfsEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [target, setTarget] = useState("");
  const [note, setNote] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listFiles()
      .then(setFiles)
      .catch((e: unknown) => setNote(e instanceof Error ? e.message : "Depo okunamadı."));
  }, []);

  useEffect(() => {
    refresh();
    const off = onVfsChange(refresh);
    return () => {
      off();
      releaseUrls();
    };
  }, [refresh]);

  useEffect(() => {
    if (!target && peers[0]) setTarget(peers[0].nodeId);
  }, [peers, target]);

  const add = useCallback(async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      await saveFiles([...list]);
      setNote(null);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Dosya kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }, []);

  const download = useCallback(async (entry: VfsEntry) => {
    const url = await objectUrl(entry.id);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = entry.name;
    a.click();
  }, []);

  const send = useCallback(
    async (entry: VfsEntry) => {
      const peer = target || peers[0]?.nodeId;
      if (!peer) {
        setNote("Bağlı cihaz yok. Önce bir cihazla eşleşin.");
        return;
      }
      const file = await readFile(entry.id);
      if (!file) return;
      try {
        await sendFileToPeer(peer, file);
        setNote(`${entry.name} gönderildi.`);
      } catch (e) {
        setNote(e instanceof Error ? e.message : "Gönderim başarısız.");
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
      className={`flex min-h-0 flex-1 flex-col gap-3 p-3 ${
        over ? "outline-2 outline-dashed outline-[var(--tb-accent)]" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="wa-press flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-[var(--tb-accent)] px-4 text-[13px] font-semibold text-[var(--tb-accent)]">
          <FolderOpen className="h-4 w-4" aria-hidden /> Dosya ekle
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void add(e.target.files)}
          />
        </label>

        {peers.length > 0 ? (
          <label className="flex min-h-10 items-center gap-2 rounded-full border border-[var(--tb-border)] px-3 font-osmono text-[11px] text-[var(--tb-muted)]">
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
          <button
            type="button"
            onClick={onTransfer}
            className="wa-press flex min-h-10 items-center gap-2 rounded-full border border-[var(--tb-border)] px-4 text-[13px] text-[var(--tb-muted)]"
          >
            <FileUp className="h-4 w-4" aria-hidden /> Aktarımlar
          </button>
        ) : null}

        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--tb-muted)]" aria-hidden />
        ) : null}
      </div>

      {note ? (
        <p className="font-osmono text-[11px] text-[var(--tb-muted)]" role="status">
          {note}
        </p>
      ) : null}

      <ul className="min-h-0 flex-1 overflow-y-auto">
        {files.map((f) => (
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
            className="flex min-h-14 cursor-grab items-center gap-3 border-b border-[var(--tb-border)] px-1 active:cursor-grabbing"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] text-[var(--tb-text)]">{f.name}</span>
              <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">
                {human(f.size)}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void send(f)}
              aria-label={`${f.name} eşe gönder`}
              className="wa-press grid h-9 w-9 place-items-center rounded-full text-[var(--tb-accent)]"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void download(f)}
              aria-label={`${f.name} indir`}
              className="wa-press grid h-9 w-9 place-items-center rounded-full text-[var(--tb-muted)]"
            >
              <Download className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => void deleteFile(f.id)}
              aria-label={`${f.name} sil`}
              className="wa-press grid h-9 w-9 place-items-center rounded-full text-[var(--tb-muted)]"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
        {files.length === 0 ? (
          <li className="px-2 py-8 text-center font-osmono text-[12px] text-[var(--tb-muted)]">
            Liste boş. Dosyaları bu pencereye sürükleyin; veriler cihazda kalır. Kayıtlı bir dosyayı Sohbet veya Medya penceresine sürükleyerek gönderebilirsiniz.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
