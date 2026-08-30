/**
 * MEDYA — tOS yerleşik oynatıcısı
 * ------------------------------------------------------------------
 * İki bölüm: Oynatıcı (bağlantı ya da cihaz dosyası) ve Yerel Kütüphane
 * (sanal dosya sistemindeki video/ses kayıtları). YouTube bağlantısı
 * gizlilik kipinde gömülür; yerel dosyalar internetsiz de oynar.
 */

import { useCallback, useEffect, useState } from "react";
import { Link2, PlayCircle } from "lucide-react";

import { WindowEmpty } from "@/components/shell/WindowShell";
import { notifyError } from "@/lib/shell/notify";
import { listByKind, objectUrl, onVfsChange, saveFiles, type VfsEntry } from "@/lib/vfs/store";

/** YouTube bağlantısını gömme adresine çevirir; değilse null döner. */
function youtubeEmbed(url: string): string | null {
  const m = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/.exec(
    url,
  );
  return m?.[1] ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

type TabId = "oynatici" | "kutuphane";

export function MediaApp() {
  const [tab, setTab] = useState<TabId>("oynatici");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState<string | null>(null);
  const [src, setSrc] = useState<{ kind: "embed" | "file"; value: string } | null>(null);
  const [library, setLibrary] = useState<VfsEntry[]>([]);

  const refresh = useCallback(() => {
    void listByKind("video/").then(async (videos) => {
      const audio = await listByKind("audio/");
      setLibrary([...videos, ...audio]);
    });
  }, []);

  useEffect(() => {
    refresh();
    return onVfsChange(refresh);
  }, [refresh]);

  // Dosyalar penceresinden sürüklenen medya buraya düşer.
  useEffect(() => {
    const onOpenMedia = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string }>).detail;
      if (detail?.url) {
        setSrc({ kind: "file", value: detail.url });
        setTab("oynatici");
      }
    };
    window.addEventListener("tedbirge:open-media", onOpenMedia);
    return () => window.removeEventListener("tedbirge:open-media", onOpenMedia);
  }, []);

  const open = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const embed = youtubeEmbed(trimmed);
    setTitle(null);
    setSrc(embed ? { kind: "embed", value: embed } : { kind: "file", value: trimmed });
    setTab("oynatici");
  };

  const playEntry = async (entry: VfsEntry) => {
    const objUrl = await objectUrl(entry.id);
    if (!objUrl) return notifyError("Dosya açılamadı", entry.name);
    setTitle(entry.name);
    setSrc({ kind: "file", value: objUrl });
    setTab("oynatici");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 gap-1.5">
        {(
          [
            { id: "oynatici", label: "Oynatıcı" },
            { id: "kutuphane", label: "Yerel Kütüphane" },
          ] as ReadonlyArray<{ id: TabId; label: string }>
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`wa-press rounded-full border px-3 py-1 font-osmono text-[11px] ${
              tab === t.id
                ? "border-[var(--tb-accent)] text-[var(--tb-accent)]"
                : "border-[var(--tb-border)] text-[var(--tb-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "oynatici" ? (
        <>
          <div className="flex items-center gap-2 rounded-full border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-4 py-2.5">
            <Link2 className="h-4 w-4 shrink-0 text-[var(--tb-muted)]" aria-hidden />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && open()}
              placeholder="YouTube veya video bağlantısı"
              aria-label="Medya bağlantısı"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--tb-text)] outline-none"
            />
            <button
              type="button"
              onClick={open}
              className="wa-press flex h-10 items-center gap-1 rounded-full bg-[var(--tb-accent)] px-4 text-[14px] font-semibold text-[var(--tb-on-accent,var(--tb-bg))]"
            >
              <PlayCircle className="h-4 w-4" aria-hidden /> Aç
            </button>
          </div>

          <label className="wa-press cursor-pointer self-start text-[13px] text-[var(--tb-accent)]">
            Cihazdan video seç (kütüphaneye eklenir)
            <input
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const [saved] = await saveFiles([file]);
                if (saved) void playEntry(saved);
              }}
            />
          </label>

          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl bg-[var(--tb-bg-soft)]">
            {src?.kind === "embed" && (
              <iframe
                title="Medya oynatıcı"
                src={src.value}
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="h-full min-h-[220px] w-full border-0"
              />
            )}
            {src?.kind === "file" && (
              <video
                src={src.value}
                controls
                aria-label={title ?? "Yerel medya"}
                className="h-full max-h-full w-full"
              />
            )}
            {!src && (
              <div className="p-4">
                <WindowEmpty
                  title="Sürükleyin veya dosya ekleyin"
                  hint="Bir bağlantı yapıştırın, cihazdan dosya seçin ya da Dosyalar penceresinden buraya sürükleyin."
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {library.length === 0 ? (
            <WindowEmpty
              title="Kütüphane boş"
              hint="Dosyalar penceresine ses/video ekleyin; burada listelenir ve internetsiz oynar."
            />
          ) : (
            <ul className="grid gap-1">
              {library.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => void playEntry(f)}
                    className="wa-press flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--tb-border)] px-3 text-left"
                  >
                    <PlayCircle className="h-4 w-4 shrink-0 text-[var(--tb-accent)]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-[var(--tb-text)]">
                        {f.name}
                      </span>
                      <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">
                        {f.mime}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
