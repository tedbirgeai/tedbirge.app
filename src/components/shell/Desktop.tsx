/**
 * MASAÜSTÜ YÜZEYİ
 * ------------------------------------------------------------------
 * Duvar kâğıdı + serbest sürüklenebilir kısayol ikonları. Kayıtlı konumu
 * olmayan ikonlar otomatik ızgaraya dizilir; dar ekranlarda sürükleme
 * kapatılır ve tek dokunuş uygulamayı açar. Boş alana ya da bir ikona
 * sağ tıklandığında tarayıcı menüsü engellenir ve işletim sistemi
 * bağlam menüsü açılır.
 */

import { useState } from "react";

import { DesktopIcon, ICON_H, ICON_W } from "@/components/shell/DesktopIcon";
import { DesktopWidgets } from "@/components/shell/DesktopWidgets";
import { ContextMenu, type MenuItem } from "@/components/shell/ContextMenu";
import { AppPropertiesDialog, appMenuItems } from "@/components/shell/AppContextMenu";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import { useWallpaper } from "@/lib/ui/wallpaper";
import { saveFiles } from "@/lib/vfs/store";
import { catalogApp, useDesktopState } from "@/shell/installed";

type Menu = { x: number; y: number; appId?: string };

export function Desktop({
  onOpen,
  onOpenNew,
  draggable,
  columnsHeight,
}: {
  onOpen: (id: string) => void;
  onOpenNew: (id: string) => void;
  draggable: boolean;
  columnsHeight: number;
}) {
  const { installed, icons } = useDesktopState();
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const wallpaper = useWallpaper();

  const perColumn = Math.max(1, Math.floor((columnsHeight - 24) / ICON_H));

  const newFolder = async () => {
    const name = `Yeni klasör ${new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
    try {
      await saveFiles([
        new File([""], `${name}.klasor`, { type: "application/x-tedbirge-folder" }),
      ]);

      notifyOk("Yeni klasör oluşturuldu", `${name} · Dosyalar penceresinde`);
    } catch {
      notifyError("Klasör oluşturulamadı", "Yerel depolama kullanılamıyor.");
    }
  };

  const desktopItems: MenuItem[] = [
    { label: "Yeni Klasör", onSelect: () => void newFolder() },
    { label: "Duvar Kâğıdını Değiştir", onSelect: () => onOpen("wallpaper") },
    { kind: "sep" },
    { label: "Yenile", onSelect: () => { window.dispatchEvent(new Event("tedbirge:vfs-refresh")); notifyOk("Masaüstü yenilendi"); } },
    { label: "Ayarlar", onSelect: () => onOpen("computer") },
  ];

  const items: MenuItem[] = menu?.appId
    ? appMenuItems({
        id: menu.appId,
        onOpen,
        onOpenNew,
        onProperties: (id) => setProperties(id),
      })
    : desktopItems;

  return (
    <div
      className="tbos-wallpaper absolute inset-0 overflow-hidden"
      data-image={wallpaper.id === "aurora" ? "off" : "on"}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
      onContextMenu={(e) => {
        // Tarayıcının yerel "İncele / Geri / Yenile" menüsü her koşulda engellenir.
        e.preventDefault();
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        setMenu({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      {installed.map((id, i) => {
        const app = catalogApp(id);
        if (!app) return null;
        const saved = icons[id];
        const col = Math.floor(i / perColumn);
        const row = i % perColumn;
        return (
          <DesktopIcon
            key={id}
            id={id}
            label={app.label}
            x={saved ? saved.x : 16 + col * (ICON_W + 12)}
            y={saved ? saved.y : 16 + row * ICON_H}
            selected={selected === id}
            draggable={draggable}
            onSelect={() => setSelected(id)}
            onOpen={() => onOpen(id)}
            onMenu={(pt) => {
              setSelected(id);
              setMenu({ x: pt.x, y: pt.y, appId: id });
            }}
          />
        );
      })}

      <DesktopWidgets onOpen={onOpen} />

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={items}
          ariaLabel={menu.appId ? "Uygulama menüsü" : "Masaüstü menüsü"}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {properties ? (
        <AppPropertiesDialog id={properties} onClose={() => setProperties(null)} />
      ) : null}
    </div>
  );
}
