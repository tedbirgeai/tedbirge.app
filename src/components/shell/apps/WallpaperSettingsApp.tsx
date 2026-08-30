/**
 * GÖRÜNÜM AYARLARI
 * ------------------------------------------------------------------
 * Duvar kâğıdı kütüphanesi ve tema seçimi. Seçim anında uygulanır ve
 * cihazda kalıcı saklanır.
 */

import { Check } from "lucide-react";

import { notifyOk } from "@/lib/shell/notify";
import { getTheme, setTheme, THEMES, type ThemeId } from "@/lib/ui/theme";
import { setWallpaper, useWallpaper, WALLPAPERS } from "@/lib/ui/wallpaper";
import { useSyncExternalStore } from "react";

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

export function WallpaperSettingsApp() {
  const { id } = useWallpaper();
  const theme = useThemeId();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      <section>
        <h3 className="mb-2 font-osmono text-[12px] tracking-wide text-[var(--tb-muted)] uppercase">
          Duvar kâğıdı
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
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
      </section>

      <section>
        <h3 className="mb-2 font-osmono text-[12px] tracking-wide text-[var(--tb-muted)] uppercase">
          Tema
        </h3>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTheme(t.id);
                notifyOk("Tema değişti", t.label);
              }}
              className={`wa-press rounded-xl border px-3 py-2 text-left ${
                theme === t.id ? "border-[var(--tb-accent)]" : "border-[var(--tb-border)]"
              }`}
            >
              <span className="block text-[13px] text-[var(--tb-text)]">{t.label}</span>
              <span className="block font-osmono text-[11px] text-[var(--tb-muted)]">{t.hint}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
