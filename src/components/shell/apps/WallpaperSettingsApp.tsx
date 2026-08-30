/**
 * GÖRÜNÜM
 * ------------------------------------------------------------------
 * Üç sekme: Duvar Kâğıdı Galerisi, Tema Paletleri, Yazı Tipi Boyutu.
 * Her seçim anında uygulanır, cihazda kalıcı saklanır ve yalnızca
 * `--tb-*` değişkenlerine yazıldığı için tüm pencerelere yansır.
 */

import { useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";

import { notifyOk } from "@/lib/shell/notify";
import { FONT_SCALES, setFontScale, useFontScale } from "@/lib/ui/font-scale";
import { getTheme, setTheme, THEMES, type ThemeId } from "@/lib/ui/theme";
import { setWallpaper, useWallpaper, WALLPAPERS } from "@/lib/ui/wallpaper";

type TabId = "duvar" | "tema" | "yazi";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "duvar", label: "Duvar Kâğıdı Galerisi" },
  { id: "tema", label: "Tema Paletleri" },
  { id: "yazi", label: "Yazı Tipi Boyutu" },
];

/** Tema değişimi DOM'a yazıldığı için basit bir yerel okuma yeterlidir. */
function useThemeId(): ThemeId {
  return useSyncExternalStore(
    (l) => {
      if (typeof document === "undefined") return () => undefined;
      const obs = new MutationObserver(l);
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      return () => obs.disconnect();
    },
    () => getTheme(),
    () => "crystal" as ThemeId,
  );
}

function WallpaperTab() {
  const { id } = useWallpaper();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {WALLPAPERS.map((w) => (
        <button
          key={w.id}
          type="button"
          aria-pressed={id === w.id}
          onClick={() => {
            setWallpaper(w.id);
            notifyOk("Duvar kâğıdı değişti", w.label);
          }}
          className={`wa-press relative overflow-hidden rounded-xl border text-left ${
            id === w.id ? "border-[var(--tb-accent)]" : "border-[var(--tb-border)]"
          }`}
        >
          {w.src ? (
            <img
              src={w.src}
              alt={w.label}
              loading="lazy"
              width={1920}
              height={1080}
              className="h-20 w-full object-cover"
            />
          ) : (
            <span className="tbos-wallpaper block h-20 w-full" aria-hidden />
          )}
          <span className="block px-2 py-1.5">
            <span className="block truncate text-[13px] font-medium text-[var(--tb-text)]">
              {w.label}
            </span>
            <span className="block truncate font-osmono text-[11px] text-[var(--tb-muted)]">
              {w.hint}
            </span>
          </span>
          {id === w.id ? (
            <span className="absolute top-1.5 right-1.5 grid h-6 w-6 place-items-center rounded-full bg-[var(--tb-accent)] text-[var(--tb-bg)]">
              <Check className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function ThemeTab() {
  const theme = useThemeId();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={theme === t.id}
          onClick={() => {
            setTheme(t.id);
            notifyOk("Tema değişti", t.label);
          }}
          className={`wa-press rounded-xl border px-3 py-2 text-left ${
            theme === t.id ? "border-[var(--tb-accent)]" : "border-[var(--tb-border)]"
          }`}
        >
          <span className="block text-[13px] font-medium text-[var(--tb-text)]">{t.label}</span>
          <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">{t.hint}</span>
        </button>
      ))}
    </div>
  );
}

function FontTab() {
  const scale = useFontScale();
  return (
    <div className="grid gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {FONT_SCALES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scale === s.id}
            onClick={() => {
              setFontScale(s.id);
              notifyOk("Yazı tipi boyutu değişti", s.label);
            }}
            className={`wa-press rounded-xl border px-3 py-2 text-left ${
              scale === s.id ? "border-[var(--tb-accent)]" : "border-[var(--tb-border)]"
            }`}
          >
            <span
              className="block font-medium text-[var(--tb-text)]"
              style={{ fontSize: `${13 * s.value}px` }}
            >
              {s.label}
            </span>
            <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">{s.hint}</span>
          </button>
        ))}
      </div>
      <p className="rounded-xl border border-dashed border-[var(--tb-border)] p-3 font-osmono text-[11px] text-[var(--tb-muted)]">
        Seçim tüm pencerelere anında uygulanır ve cihazda saklanır.
      </p>
    </div>
  );
}

export function WallpaperSettingsApp() {
  const [tab, setTab] = useState<TabId>("duvar");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[var(--tb-border)] p-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`wa-press shrink-0 rounded-full border px-3 py-1 font-osmono text-[11px] ${
              tab === t.id
                ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                : "border-[var(--tb-border)] text-[var(--tb-muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "duvar" ? <WallpaperTab /> : tab === "tema" ? <ThemeTab /> : <FontTab />}
      </div>
    </div>
  );
}
