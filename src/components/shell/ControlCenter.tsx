/**
 * HIZLI KONTROL MERKEZİ
 * ------------------------------------------------------------------
 * Sistem çubuğundaki durum alanına tıklanınca açılır: ses, parlaklık,
 * ağ durumu, tema ve profil kısayolu. Tüm değerler gerçek sistem
 * durumundan okunur.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Moon, Sun, UserRound, Volume2, VolumeX, Wifi } from "lucide-react";

import { isSoundMuted, setSoundMuted } from "@/lib/chat/sounds";
import { notify } from "@/lib/shell/notify";
import { getTheme, setTheme, THEMES } from "@/lib/ui/theme";
import { setBrightness, useWallpaper } from "@/lib/ui/wallpaper";

export function ControlCenter({
  open,
  onClose,
  status,
  peers,
  rttMs,
  onPersonalize,
}: {
  open: boolean;
  onClose: () => void;
  status: string;
  peers: number;
  rttMs: number | null;
  onPersonalize: () => void;
}) {
  const { brightness } = useWallpaper();
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

      <button
        type="button"
        onClick={() => {
          const next = !muted;
          setSoundMuted(next);
          setMuted(next);
          notify(next ? "Sistem sesleri kapalı" : "Sistem sesleri açık");
        }}
        className="wa-press mt-2 flex w-full items-center gap-2 rounded-xl border border-[var(--tb-border)] px-3 py-2 text-left"
      >
        {muted ? (
          <VolumeX className="h-4 w-4 text-[var(--tb-muted)]" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
        )}
        <span className="text-[13px] text-[var(--tb-text)]">
          {muted ? "Ses kapalı" : "Ses açık"}
        </span>
      </button>

      <label className="mt-2 block rounded-xl border border-[var(--tb-border)] px-3 py-2">
        <span className="flex items-center gap-2 font-osmono text-[11px] text-[var(--tb-muted)]">
          <Sun className="h-3.5 w-3.5" aria-hidden /> Parlaklık
        </span>
        <input
          type="range"
          min={0.5}
          max={1.2}
          step={0.05}
          value={brightness}
          onChange={(e) => setBrightness(Number(e.target.value))}
          aria-label="Yüzey parlaklığı"
          className="mt-1.5 w-full accent-[var(--tb-accent)]"
        />
      </label>

      <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--tb-border)] px-3 py-2">
        <Wifi className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
        <span className="min-w-0 flex-1 truncate font-osmono text-[11px] text-[var(--tb-muted)]">
          {status} · {peers} cihaz{rttMs != null ? ` · ${rttMs} ms` : ""}
        </span>
      </div>

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
