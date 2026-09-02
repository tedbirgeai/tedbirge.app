/**
 * MASAÜSTÜ YÜZEYİ
 * ------------------------------------------------------------------
 * Duvar kâğıdı + katı CSS ızgarasına dizilen kısayol ikonları. İkonlar
 * dikey sütunlar hâlinde akar (grid-flow-col), böylece üst üste binme
 * kesin olarak engellenir. Boş alana ya da bir ikona sağ tıklandığında
 * tarayıcı menüsü engellenir ve işletim sistemi bağlam menüsü açılır.
 */

import { useState } from "react";

import { DesktopIcon } from "@/components/shell/DesktopIcon";
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
}: {
  onOpen: (id: string) => void;
  onOpenNew: (id: string) => void;
}) {
  const { installed } = useDesktopState();
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const wallpaper = useWallpaper();



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
    {
      label: "Kartları Göster",
      onSelect: () => {
        window.localStorage.removeItem("tedbirge:widgets:hidden");
        window.dispatchEvent(new Event("tedbirge:widgets-show"));
        notifyOk("Masaüstü kartları geri geldi");
      },
    },
    { label: "Yenile", onSelect: () => { window.dispatchEvent(new Event("tedbirge:vfs-refresh")); notifyOk("Masaüstü yenilendi"); } },
    { label: "Ayarlar", onSelect: () => onOpen("settings") },

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
      {compact ? (
        <DesktopPager
          ids={installed.filter((id) => catalogApp(id))}
          renderIcon={renderIcon}
          onEmptyPointerDown={() => setSelected(null)}
        />
      ) : (
        <div
          className="grid h-full grid-flow-col grid-rows-[repeat(auto-fill,100px)] justify-start gap-6 overflow-hidden p-6"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          {installed.map((id) => (catalogApp(id) ? renderIcon(id) : null))}
        </div>
      )}


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
