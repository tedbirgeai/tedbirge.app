/**
 * UYGULAMA BAŞLATICI (App Launcher)
 * ------------------------------------------------------------------
 * Masaüstünün tek uygulama girişi: üç ana ürün modülü en üstte, yerleşik
 * WebOS araçları ve harici web hedefleri aynı premium ikon yüzeyiyle listelenir.
 */

import { useEffect } from "react";
import { X } from "lucide-react";

import { AppIconSurface, appSecurityLabels } from "@/components/shell/AppIconBadge";
import { WEB_APPS } from "@/shell/web-apps";

export type LauncherTile = { id: string; label: string; hint: string; featured?: boolean };

export const LOCAL_TILES: LauncherTile[] = [
  {
    id: "axiom",
    label: "AXIOM",
    hint: "ASK ASCII, Z3/Lean doğrulama ve mühürlü karar kapısı",
    featured: true,
  },
  {
    id: "messenger",
    label: "Connect Sohbet",
    hint: "WhatsApp tarzı E2EE mesaj, medya, dosya ve sesli not",
    featured: true,
  },
  {
    id: "calls",
    label: "Connect HD Arama",
    hint: "Tek tık 1:1 arama, toplantı odası, ekran paylaşımı ve el kaldırma",
    featured: true,
  },
  {
    id: "limen",
    label: "LIMEN",
    hint: "P2P Git/WebRTC delta sync, AXIOM düğümleri ve MCP",
    featured: true,
  },
  { id: "files", label: "Dosyalar", hint: "Şifreli VFS ve Quick Look" },
  { id: "computer", label: "Cihazım", hint: "Düğüm, donanım ve ISO durumu" },
  { id: "yonetim", label: "Yönetim Portalı", hint: "Ağ, lisans ve kayıtlar" },
  { id: "settings", label: "Ayarlar", hint: "Sistem, güvenlik, hesap ve görünüm" },
  { id: "store", label: "Bento Mağaza", hint: "İmzalı .tbapp paketleri" },
  { id: "transfer", label: "Aktarım", hint: "Eşler arası dosya gönderimi" },
  { id: "apps", label: "Paketler", hint: "Kurulu .tbapp paketleri" },
  { id: "mesh", label: "Ağ", hint: "Mesh düğüm ve taşıyıcı durumu" },
  { id: "relay", label: "Röle", hint: "Store-and-forward taşıma" },
  { id: "writer", label: "Writer", hint: "Yerel yazı belgeleri" },
  { id: "sheets", label: "Sheets", hint: "Yerel hesap tabloları" },
  { id: "slides", label: "Slides", hint: "Yerel sunular" },
  { id: "pdf", label: "PDF Studio", hint: "PDF görüntüleme ve yazdırma" },
  { id: "notes", label: "Notes", hint: "Hızlı notlar" },
  { id: "organizer", label: "Organizer", hint: "Görev ve randevu ajandası" },
  { id: "terminal", label: "Terminal", hint: "POSIX/DOS uyumlu komut satırı" },
  { id: "media", label: "Medya", hint: "Video oynatıcı" },
  { id: "music", label: "Müzik", hint: "Cihazdaki parçalar" },
  { id: "news", label: "Haberler", hint: "Gündem ve teknoloji başlıkları" },
  { id: "profile", label: "Profil", hint: "Hesap, abonelik, lisans ve kota" },
  { id: "wallpaper", label: "Görünüm", hint: "Duvar kâğıdı ve tema" },
];

export const WEB_TILES: LauncherTile[] = WEB_APPS.map((a) => ({
  id: a.id,
  label: a.label,
  hint: a.hint,
}));

export function AppLauncher({
  open,
  onClose,
  onLaunch,
}: {
  open: boolean;
  onClose: () => void;
  onLaunch: (id: string) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Başlatıcıyı kapat"
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--tb-bg)_58%,transparent)] backdrop-blur-sm"
      />
      <div className="tbos-launcher relative m-0 max-h-[82vh] overflow-y-auto rounded-t-2xl p-4 sm:m-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-osmono text-[13px] uppercase tracking-wide text-[var(--tb-text)]">
              TEDBİRGE® WEBOS
            </h2>
            <p className="mt-1 text-[12px] text-[var(--tb-muted)]">
              Deterministik AXIOM, Connect sohbet ve HD toplantı modülleri
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="wa-press flex h-9 w-9 items-center justify-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="mb-3 font-osmono text-[12px] uppercase tracking-wide text-[var(--tb-muted)]">
          Ana modüller
        </h3>
        <Grid tiles={LOCAL_TILES.filter((t) => t.featured)} onLaunch={onLaunch} featured />

        <h3 className="mt-6 mb-3 font-osmono text-[12px] uppercase tracking-wide text-[var(--tb-muted)]">
          WebOS uygulamaları
        </h3>
        <Grid tiles={LOCAL_TILES.filter((t) => !t.featured)} onLaunch={onLaunch} />

        <h3 className="mt-6 mb-3 font-osmono text-[12px] uppercase tracking-wide text-[var(--tb-muted)]">
          Web uygulamaları
        </h3>
        <Grid tiles={WEB_TILES} onLaunch={onLaunch} />
      </div>
    </div>
  );
}

function Grid({
  tiles,
  onLaunch,
  featured = false,
}: {
  tiles: LauncherTile[];
  onLaunch: (id: string) => void;
  featured?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-2 gap-3 ${featured ? "lg:grid-cols-3" : "sm:grid-cols-4 lg:grid-cols-6"}`}
    >
      {tiles.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onLaunch(t.id)}
          className={`tbos-launcher-tile wa-press flex flex-col rounded-2xl p-3 text-left transition ${featured ? "min-h-32" : "min-h-24"}`}
        >
          <div className="flex items-start justify-between gap-2">
            <AppIconSurface
              id={t.id}
              size="launcher"
              showBadge={featured || !t.id.startsWith("web.")}
            />
            {featured ? (
              <span className="rounded-full border border-[var(--tb-border)] px-2 py-0.5 font-osmono text-[10px] text-[var(--tb-accent)]">
                V5 ANA
              </span>
            ) : null}
          </div>
          <span className="mt-3 block min-w-0">
            <span className="block truncate text-[15px] font-semibold text-[var(--tb-text)]">
              {t.label}
            </span>
            <span className="mt-1 line-clamp-2 font-osmono text-[11px] text-[var(--tb-muted)]">
              {t.hint}
            </span>
          </span>
          {featured ? (
            <span className="mt-auto flex flex-wrap gap-1 pt-3">
              {appSecurityLabels(t.id)
                .slice(0, 2)
                .map((b) => (
                  <span
                    key={b}
                    className="rounded-md border border-[var(--tb-border)] px-1.5 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]"
                  >
                    {b}
                  </span>
                ))}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
