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
import { describeNode, getNodeSnapshot } from "@/lib/node-runtime";
import type { SystemPatch } from "@/lib/studio/intent";


export type PatchResult = {
  /** Kullanıcıya gösterilecek Türkçe özet. */
  summary: string;
  /** Güncellenen ya da incelenen çekirdek bileşen adı. */
  component: string;
  applied: boolean;
  /** "mudahale": yerinde değişiklik yapıldı. "inceleme": yalnız ölçüm/rapor. */
  kind: "mudahale" | "inceleme";
};

/** Salt-okunur katman incelemesi: gerçek ölçüm yoksa iddia üretilmez. */
function inspect(target: "ag" | "cekirdek" | "vfs" | "guvenlik" | "performans" | "arayuz"): PatchResult {
  const s = getNodeSnapshot();
  const n = describeNode(s);
  switch (target) {
    case "ag":
      return {
        component: "Ağ / Mesh katmanı",
        kind: "inceleme",
        applied: false,
        summary: `${n.text}. Doğrudan bağlı cihaz: ${n.directPeers}, sırada bekleyen gönderim: ${n.queued}. Bağlantı kurulumu karşı cihazın da açık olmasını gerektirir.`,
      };
    case "cekirdek":
      return {
        component: "Çekirdek / WASM çalışma zamanı",
        kind: "inceleme",
        applied: false,
        summary:
          "Üretilen kodlar ayrı iş parçacığında, çağrı başına 1500 ms sert kesme sigortasıyla çalışır. Doğrulama motoru karar veremezse sonuç 'karar verilemedi' olarak işaretlenir; asla onaylanmış gibi gösterilmez.",
      };
    case "vfs":
      return {
        component: "Dosya sistemi (VFS)",
        kind: "inceleme",
        applied: false,
        summary:
          "Her uygulama yalnız kendi /appdata/{uygulama} alanına yazabilir; kaynak ağacına yalnız yetkili stüdyo erişir. Silinen dosyalar çöp kutusuna taşınır ve geri alınabilir.",
      };
    case "guvenlik":
      return {
        component: "Güvenlik ve yalıtım",
        kind: "inceleme",
        applied: false,
        summary:
          "Uygulamalar yalıtılmış çalışır; ağ, dosya ve bildirim erişimi tek tek izne bağlıdır. İzin doğrulanamazsa istek reddedilir.",
      };
    case "performans": {
      const mem = memoryMb();
      return {
        component: "Bellek ve akıcılık",
        kind: "inceleme",
        applied: false,
        summary: mem
          ? `Bu sekmenin kullandığı bellek yaklaşık ${mem} MB. Arka planda küçültülen pencereler dondurulur, böylece yük azalır.`
          : "Bu tarayıcı bellek ölçümü paylaşmıyor. Arka planda küçültülen pencereler dondurulur, böylece yük azalır.",
      };
    }
    case "arayuz":
      return {
        component: "Pencere ve masaüstü düzeni",
        kind: "inceleme",
        applied: false,
        summary:
          "Düzen ekran genişliğine göre üç kademede çalışır: telefon, tablet ve masaüstü. Pencere yapıştırma ve kısayollar etkin.",
      };
  }
}

function memoryMb(): number | null {
  const p = globalThis.performance as (Performance & { memory?: { usedJSHeapSize: number } }) | undefined;
  const used = p?.memory?.usedJSHeapSize;
  return typeof used === "number" ? Math.round(used / (1024 * 1024)) : null;
}


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

/** Yamayı canlı sisteme uygular ya da ilgili katmanı inceler. */
export function applySystemPatch(patch: SystemPatch): PatchResult {
  switch (patch.target) {
    case "ag":
    case "cekirdek":
    case "vfs":
    case "guvenlik":
    case "performans":
    case "arayuz":
      return inspect(patch.target);
    case "tema": {
      const theme = patch.theme ?? nextTheme();
      setTheme(theme);
      const label = THEMES.find((t) => t.id === theme)?.label ?? theme;
      return {
        component: "Tema motoru",
        summary: `Tema "${label}" olarak güncellendi.`,
        applied: true,
        kind: "mudahale",
      };
    }
    case "duvarkagidi": {
      if (patch.auto) {
        setAutoWallpaper(true);
        return {
          component: "Duvar kâğıdı motoru",
          summary: "Gün/gece otomatik duvar kâğıdı geçişi açıldı.",
          applied: true,
          kind: "mudahale",
        };
      }
      const id = (patch.wallpaper ?? "") as WallpaperId;
      if (patch.wallpaper && wallpaperInfo(id)) {
        setWallpaper(id);
        return {
          component: "Duvar kâğıdı motoru",
          summary: `Duvar kâğıdı "${wallpaperInfo(id)!.label}" olarak uygulandı.`,
          applied: true,
          kind: "mudahale",
        };
      }
      return {
        component: "Duvar kâğıdı motoru",
        summary: `Hangi duvar kâğıdı? Seçenekler: ${WALLPAPERS.map((w) => w.label).join(", ")}.`,
        applied: false,
        kind: "mudahale",
      };
    }
    case "parlaklik": {
      const next = currentBrightness() + patch.delta;
      setBrightness(next);
      return {
        component: "Ekran katmanı",
        summary: `Parlaklık ${patch.delta > 0 ? "artırıldı" : "azaltıldı"}.`,
        applied: true,
        kind: "mudahale",
      };
    }
    case "gecelsigi": {
      setNightLight(patch.on ? 0.35 : 0);
      return {
        component: "Gece ışığı katmanı",
        summary: patch.on ? "Gece ışığı açıldı." : "Gece ışığı kapatıldı.",
        applied: true,
        kind: "mudahale",
      };
    }
    case "ses": {
      setSystemMuted(patch.muted);
      return {
        component: "Sistem ses motoru",
        summary: patch.muted ? "Sistem sesleri kapatıldı." : "Sistem sesleri açıldı.",
        applied: true,
        kind: "mudahale",
      };
    }
    case "ayarlar":
      return {
        component: "Ayarlar paneli",
        summary:
          "Ayarlar panelinden yerinde değiştirilebilenler: tema, duvar kâğıdı, parlaklık, gece ışığı ve sistem sesleri. Hangisini güncelleyeyim?",
        applied: false,
        kind: "mudahale",
      };
  }
}


export default applySystemPatch;
