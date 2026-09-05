/**
 * MÜZİK — tOS yerleşik uygulaması
 * ------------------------------------------------------------------
 * Üç bölüm: Oynatıcı, Çalma Listesi ve Yerel Kütüphane (sanal dosya
 * sistemindeki ses kayıtları). Parçalar cihazda çalar; hiçbir sunucuya
 * yüklenmez (sıfır-bulut ilkesi).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Music, Pause, Play, Plus, SkipBack, SkipForward, Trash2 } from "lucide-react";

import { WindowEmpty } from "@/components/shell/WindowShell";
import { notifyError } from "@/lib/shell/notify";
import { listByKind, objectUrl, onVfsChange, saveFiles, type VfsEntry } from "@/lib/vfs/store";

type Track = { id: string; name: string; url: string };
type TabId = "oynatici" | "liste" | "kutuphane";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "oynatici", label: "Oynatıcı" },
  { id: "liste", label: "Çalma Listesi" },
  { id: "kutuphane", label: "Yerel Kütüphane" },
];

export function MusicApp() {
  const [tab, setTab] = useState<TabId>("oynatici");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [library, setLibrary] = useState<VfsEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const current = tracks[index] ?? null;

  const refresh = useCallback(() => {
    void listByKind("audio/").then(setLibrary);
  }, []);

  useEffect(() => {
    refresh();
    return onVfsChange(refresh);
  }, [refresh]);

  /** Kütüphaneden bir kaydı çalma listesine ekler ve çalar. */
  const enqueue = useCallback(async (entry: VfsEntry, play = true) => {
    const url = await objectUrl(entry.id);
    if (!url) return notifyError("Parça açılamadı", entry.name);
    setTracks((prev) => {
      const found = prev.findIndex((p) => p.id === entry.id);
      if (found >= 0) {
        if (play) setIndex(found);
        return prev;
      }
      if (play) setIndex(prev.length);
      return [...prev, { id: entry.id, name: entry.name, url }];
    });
    if (play) {
      setPlaying(true);
      setTab("oynatici");
    }
  }, []);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const audio = [...files].filter((f) => f.type.startsWith("audio/"));
    if (audio.length === 0) return notifyError("Ses dosyası seçilmedi");
    const saved = await saveFiles(audio);
    for (const entry of saved) await enqueue(entry, entry === saved[0]);
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el || !current) return;
    if (playing) el.pause();
    else void el.play();
  };

  const step = (delta: number) => {
    if (tracks.length === 0) return;
    setIndex((i) => (i + delta + tracks.length) % tracks.length);
    setPlaying(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {TABS.map((t) => (
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
        <label className="wa-press ml-auto flex cursor-pointer items-center gap-2 rounded-full bg-[var(--tb-accent)] px-3 py-1.5 text-[13px] font-semibold text-[var(--tb-on-accent,var(--tb-bg))]">
          <Plus className="h-4 w-4" aria-hidden /> Şarkı ekle
          <input
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              e.target.value = "";
              void add(files);
            }}
          />
        </label>
      </div>

      {tab === "oynatici" ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]">
              <Music className="h-6 w-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] text-[var(--tb-text)]">
                {current?.name ?? "Parça seçilmedi"}
              </span>
              <span className="block text-[12px] text-[var(--tb-muted)]">
                {tracks.length} parça · cihazda çalıyor
              </span>
            </span>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Önceki"
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-[var(--tb-muted)]"
            >
              <SkipBack className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Duraklat" : "Çal"}
              className="wa-press flex h-11 w-11 items-center justify-center rounded-full bg-[var(--tb-accent)] text-[var(--tb-on-accent,var(--tb-bg))]"
            >
              {playing ? (
                <Pause className="h-5 w-5" aria-hidden />
              ) : (
                <Play className="h-5 w-5" aria-hidden />
              )}
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Sonraki"
              className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-[var(--tb-muted)]"
            >
              <SkipForward className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <audio
            ref={audioRef}
            src={current?.url}
            autoPlay={playing}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => step(1)}
            controls
            className="w-full"
          />

          {!current ? (
            <WindowEmpty
              title="Sürükleyin veya dosya ekleyin"
              hint="Cihazınızdan ses dosyası ekleyin ya da yerel kütüphaneden bir parça seçin."
            />
          ) : null}
        </>
      ) : null}

      {tab === "liste" ? (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {tracks.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIndex(i);
                  setPlaying(true);
                  setTab("oynatici");
                }}
                className={`wa-press min-h-11 min-w-0 flex-1 truncate px-2 text-left text-[14px] ${
                  i === index ? "text-[var(--tb-accent)]" : "text-[var(--tb-text)]"
                }`}
              >
                {t.name}
              </button>
              <button
                type="button"
                aria-label={`${t.name} listeden kaldır`}
                onClick={() => setTracks((prev) => prev.filter((p) => p.id !== t.id))}
                className="wa-press flex h-10 w-10 items-center justify-center rounded-full text-[var(--tb-muted)]"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
          {tracks.length === 0 ? (
            <li>
              <WindowEmpty
                title="Çalma listesi boş"
                hint="Yerel kütüphaneden parça ekleyerek listeyi oluşturun."
              />
            </li>
          ) : null}
        </ul>
      ) : null}

      {tab === "kutuphane" ? (
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {library.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => void enqueue(f)}
                className="wa-press flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--tb-border)] px-3 text-left"
              >
                <Music className="h-4 w-4 shrink-0 text-[var(--tb-accent)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--tb-text)]">
                  {f.name}
                </span>
              </button>
            </li>
          ))}
          {library.length === 0 ? (
            <li>
              <WindowEmpty
                title="Kütüphane boş"
                hint="Cihazınızdan ses dosyası ekleyin; kayıtlar bu cihazda kalır."
              />
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
