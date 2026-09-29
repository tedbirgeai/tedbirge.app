/**
 * YERİNDE SİSTEM YAMASI (MOD B)
 * ------------------------------------------------------------------
 * Niyet sınıflandırıcı "sistem" dediğinde bu modül çalışır: ilgili çekirdek
 * bileşen (tema, duvar kâğıdı, parlaklık, gece ışığı, ses) doğrudan yerinde
 * güncellenir. Yeni /repo/apps klasörü açılmaz, masaüstüne ikon eklenmez.
 */

import { setTheme, THEMES, getTheme, type ThemeId } from "@/lib/ui/theme";
import {
  setWallpaper,
  setAutoWallpaper,
  setBrightness,
  setNightLight,
  WALLPAPERS,
  wallpaperInfo,
  type WallpaperId,
} from "@/lib/ui/wallpaper";
import { setSystemMuted } from "@/os/system/audio";
import type { SystemPatch } from "@/lib/studio/intent";

export type PatchResult = {
  /** Kullanıcıya gösterilecek Türkçe özet. */
  summary: string;
  /** Güncellenen çekirdek bileşen adı. */
  component: string;
  applied: boolean;
};

function currentBrightness(): number {
  if (typeof document === "undefined") return 1;
  const v = Number(getComputedStyle(document.documentElement).getPropertyValue("--tb-brightness"));
  return Number.isFinite(v) && v > 0 ? v : 1;
}

function nextTheme(): ThemeId {
  const now = getTheme();
  const i = THEMES.findIndex((t) => t.id === now);
  return THEMES[(i + 1) % THEMES.length]!.id;
}

/** Yamayı canlı sisteme uygular. */
export function applySystemPatch(patch: SystemPatch): PatchResult {
  switch (patch.target) {
    case "tema": {
      const theme = patch.theme ?? nextTheme();
      setTheme(theme);
      const label = THEMES.find((t) => t.id === theme)?.label ?? theme;
      return { component: "Tema motoru", summary: `Tema "${label}" olarak güncellendi.`, applied: true };
    }
    case "duvarkagidi": {
      if (patch.auto) {
        setAutoWallpaper(true);
        return {
          component: "Duvar kâğıdı motoru",
          summary: "Gün/gece otomatik duvar kâğıdı geçişi açıldı.",
          applied: true,
        };
      }
      const id = (patch.wallpaper ?? "") as WallpaperId;
      if (patch.wallpaper && wallpaperInfo(id)) {
        setWallpaper(id);
        return {
          component: "Duvar kâğıdı motoru",
          summary: `Duvar kâğıdı "${wallpaperInfo(id)!.label}" olarak uygulandı.`,
          applied: true,
        };
      }
      return {
        component: "Duvar kâğıdı motoru",
        summary: `Hangi duvar kâğıdı? Seçenekler: ${WALLPAPERS.map((w) => w.label).join(", ")}.`,
        applied: false,
      };
    }
    case "parlaklik": {
      const next = currentBrightness() + patch.delta;
      setBrightness(next);
      return {
        component: "Ekran katmanı",
        summary: `Parlaklık ${patch.delta > 0 ? "artırıldı" : "azaltıldı"}.`,
        applied: true,
      };
    }
    case "gecelsigi": {
      setNightLight(patch.on ? 0.35 : 0);
      return {
        component: "Gece ışığı katmanı",
        summary: patch.on ? "Gece ışığı açıldı." : "Gece ışığı kapatıldı.",
        applied: true,
      };
    }
    case "ses": {
      setSystemMuted(patch.muted);
      return {
        component: "Sistem ses motoru",
        summary: patch.muted ? "Sistem sesleri kapatıldı." : "Sistem sesleri açıldı.",
        applied: true,
      };
    }
    case "ayarlar":
      return {
        component: "Ayarlar paneli",
        summary:
          "Ayarlar panelinden yerinde değiştirilebilenler: tema, duvar kâğıdı, parlaklık, gece ışığı ve sistem sesleri. Hangisini güncelleyeyim?",
        applied: false,
      };
  }
}

export default applySystemPatch;
