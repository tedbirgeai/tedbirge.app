/**
 * HIZLI KONTROL MERKEZİ
 * ------------------------------------------------------------------
 * Sistem çubuğundaki durum alanına tıklanınca açılır: ses seviyesi,
 * parlaklık / gece ışığı, ağ durumu, tema, odak modu ve profil kısayolu.
 * Tüm değerler gerçek sistem durumundan okunur ve anında uygulanır.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@/components/shell/OsLink";
import { Focus, Moon, Sun, UserRound, Volume2, VolumeX, Wifi } from "lucide-react";

import { applySystemVolume, isSoundMuted, setSoundMuted, tapSound } from "@/lib/chat/sounds";
import { notify } from "@/lib/shell/notify";
import { setFocusMode, useFocusMode } from "@/lib/shell/focus-mode";
import { setVolume, useVolume } from "@/lib/ui/audio-gain";
import { getTheme, setTheme, THEMES } from "@/lib/ui/theme";
import { setBrightness, setNightLight, useWallpaper } from "@/lib/ui/wallpaper";

export function ControlCenter({
  open,
  onClose,
  status,
  peers,
  rttMs,
  onPersonalize,
  onNetwork,
}: {
  open: boolean;
  onClose: () => void;
  status: string;
  peers: number;
  rttMs: number | null;
  onPersonalize: () => void;
  onNetwork: () => void;
}) {
  const { brightness, night } = useWallpaper();
  const volume = useVolume();
  const focus = useFocusMode();
  const [muted, setMuted] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setMuted(isSoundMuted());
    setThemeState(getTheme());
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Kontrol merkezi"
      className="tbos-window absolute top-full left-3 z-[90] mt-1.5 w-72 rounded-2xl p-3 shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-osmono text-[11px] text-[var(--tb-muted)]">Kontrol Merkezi</span>
        <Link
          to="/system"
          onClick={onClose}
          className="wa-press inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-osmono text-[11px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <UserRound className="h-3.5 w-3.5" aria-hidden /> Profil
        </Link>
      </div>

      <div className="mt-2 rounded-xl border border-[var(--tb-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !muted;
              setSoundMuted(next);
              setMuted(next);
              notify(next ? "Sistem sesleri kapalı" : "Sistem sesleri açık");
            }}
            aria-label={muted ? "Sesi aç" : "Sesi kapat"}
            className="wa-press grid h-6 w-6 place-items-center rounded-full"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-[var(--tb-muted)]" aria-hidden />
            ) : (
              <Volume2 className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
            )}
          </button>
          <span className="flex-1 font-osmono text-[11px] text-[var(--tb-muted)]">
            Ses · %{Math.round(volume * 100)}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            applySystemVolume();
          }}
          onPointerUp={() => {
            if (!muted) tapSound();
          }}
          aria-label="Sistem ses seviyesi"
          className="mt-1.5 w-full accent-[var(--tb-accent)]"
        />
      </div>

      <label className="mt-2 block rounded-xl border border-[var(--tb-border)] px-3 py-2">
        <span className="flex items-center gap-2 font-osmono text-[11px] text-[var(--tb-muted)]">
          <Sun className="h-3.5 w-3.5" aria-hidden /> Parlaklık · %
          {Math.round(brightness * 100)}
        </span>
        <input
          type="range"
          min={0.4}
          max={1.2}
          step={0.05}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          aria-label="Ekran parlaklığı"
          className="mt-1.5 w-full accent-[var(--tb-accent)]"
        />
      </label>

      <label className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--tb-border)] px-3 py-2">
        <Moon className="h-3.5 w-3.5 text-[var(--tb-muted)]" aria-hidden />
        <span className="flex-1 font-osmono text-[11px] text-[var(--tb-muted)]">
          Gece ışığı · %{Math.round(night * 100)}
        </span>
        <input
          type="range"
          min={0}
          max={0.6}
          step={0.05}
          value={night}
          onChange={(e) => setNightLight(Number(e.target.value))}
          aria-label="Gece ışığı filtresi"
          className="w-24 accent-[var(--tb-accent)]"
        />
      </label>

      <button
        type="button"
        onClick={() => {
          onNetwork();
          onClose();
        }}
        className="wa-press mt-2 flex w-full items-center gap-2 rounded-xl border border-[var(--tb-border)] px-3 py-2 text-left"
      >
        <Wifi className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-osmono text-[11px] text-[var(--tb-muted)]">
          {status} · {peers} cihaz{rttMs != null ? ` · ${rttMs} ms` : ""}
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          setFocusMode(!focus);
          notify(focus ? "Odak modu kapandı" : "Odak modu açık");
        }}
        aria-pressed={focus}
        className={`wa-press mt-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${
          focus ? "border-[var(--tb-accent)]" : "border-[var(--tb-border)]"
        }`}
      >
        <Focus
          className={`h-4 w-4 ${focus ? "text-[var(--tb-accent)]" : "text-[var(--tb-muted)]"}`}
          aria-hidden
        />
        <span className="font-osmono text-[12px] text-[var(--tb-text)]">
          {focus ? "Odak modu açık" : "Odak modunu aç"}
        </span>
      </button>

      <div className="mt-2 flex gap-1.5">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTheme(t.id);
              setThemeState(t.id);
              notify("Tema değişti", t.label);
            }}
            className={`wa-press flex-1 rounded-lg border px-2 py-1.5 font-osmono text-[11px] ${
              theme === t.id
                ? "border-[var(--tb-accent)] text-[var(--tb-accent)]"
                : "border-[var(--tb-border)] text-[var(--tb-muted)]"
            }`}
          >
            {t.label.replace("Açık ", "")}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          onPersonalize();
          onClose();
        }}
        className="wa-press mt-2 flex w-full items-center gap-2 rounded-xl border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
      >
        <Moon className="h-4 w-4" aria-hidden /> Duvar kâğıdı ve tema
      </button>
    </div>
  );
}
