/**
 * UYGULAMA BAĞLAM MENÜSÜ ÖĞELERİ + ÖZELLİKLER KARTI
 * ------------------------------------------------------------------
 * Masaüstü kısayolu ve Dock simgesi aynı menüyü kullanır: aç, yeni
 * pencerede aç, harici sekmede aç, kısayolu sil, özellikler.
 */

import { X } from "lucide-react";

import { AppIcon } from "@/components/shell/app-icons";
import type { MenuItem } from "@/components/shell/ContextMenu";
import { getApp } from "@/apps/registry";
import { catalogApp, uninstallApp } from "@/shell/installed";
import { webApp } from "@/shell/web-apps";
import { notifyOk } from "@/lib/shell/notify";
import { gatewayUrl } from "@/lib/shell/embed-strategy";

export function appMenuItems({
  id,
  onOpen,
  onOpenNew,
  onProperties,
}: {
  id: string;
  onOpen: (id: string) => void;
  onOpenNew: (id: string) => void;
  onProperties: (id: string) => void;
}): MenuItem[] {
  const app = catalogApp(id);
  const web = webApp(id);
  return [
    { label: "Uygulamayı Aç", onSelect: () => onOpen(id) },
    { label: "Yeni Pencerede Aç", onSelect: () => onOpenNew(id) },
    {
      label: "Harici Sekmede Aç",
      disabled: !web,
      onSelect: () => {
        if (web) window.open(web.url, "_blank", "noopener,noreferrer");
      },
    },
    { kind: "sep" },
    {
      label: "Kısayolu Sil",
      danger: true,
      disabled: !app || app.builtin,
      onSelect: () => {
        uninstallApp(id);
        notifyOk("Kısayol kaldırıldı", `${app?.label ?? id} masaüstünden silindi`);
      },
    },
    { label: "Özellikler", onSelect: () => onProperties(id) },
  ];
}

export function AppPropertiesDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const app = catalogApp(id);
  const web = webApp(id);
  const manifest = getApp(id);
  const rows: Array<[string, string]> = [
    ["Ad", app?.label ?? id],
    ["Kimlik", id],
    ["Tür", web ? "Harici web uygulaması" : (manifest?.kind ?? "yerleşik")],
    ["Kategori", app?.category ?? "—"],
    ["Açıklama", app?.hint ?? "—"],
    ...(web ? ([["Hedef", web.url]] as Array<[string, string]>) : []),
    ...(web ? ([["Geçit", gatewayUrl(web.url)]] as Array<[string, string]>) : []),
    ["Yetenekler", manifest?.capabilities.length ? manifest.capabilities.join(", ") : "—"],
  ];

  return (
    <div
      className="absolute inset-0 z-[130] grid place-items-center bg-[color-mix(in_srgb,var(--tb-bg)_55%,transparent)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${app?.label ?? id} özellikleri`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tbos-window w-full max-w-md rounded-2xl p-4 shadow-2xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="tbos-desk-glyph grid h-11 w-11 place-items-center rounded-2xl">
            <AppIcon id={id} className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-[var(--tb-text)]">
              {app?.label ?? id}
            </p>
            <p className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">Özellikler</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="wa-press grid h-8 w-8 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <dl className="space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 border-t border-[var(--tb-border)] pt-1.5">
              <dt className="w-24 shrink-0 font-osmono text-[11px] text-[var(--tb-muted)]">{k}</dt>
              <dd className="min-w-0 flex-1 break-all font-osmono text-[11px] text-[var(--tb-text)]">
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
