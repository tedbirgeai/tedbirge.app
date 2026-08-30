/**
 * MASAÜSTÜ YÜZEYİ
 * ------------------------------------------------------------------
 * Duvar kâğıdı + serbest sürüklenebilir kısayol ikonları. Kayıtlı konumu
 * olmayan ikonlar otomatik ızgaraya dizilir; dar ekranlarda sürükleme
 * kapatılır ve tek dokunuş uygulamayı açar. Boş alana sağ tıklandığında
 * işletim sistemi bağlam menüsü açılır.
 */

import { useEffect, useState } from "react";

import { DesktopIcon, ICON_H, ICON_W } from "@/components/shell/DesktopIcon";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import { useWallpaper } from "@/lib/ui/wallpaper";
import { saveFiles } from "@/lib/vfs/store";
import { catalogApp, useDesktopState } from "@/shell/installed";

type Menu = { x: number; y: number };

export function Desktop({
  onOpen,
  draggable,
  columnsHeight,
}: {
  onOpen: (id: string) => void;
  draggable: boolean;
  columnsHeight: number;
}) {
  const { installed, icons } = useDesktopState();
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const wallpaper = useWallpaper();

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

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

  return (
    <div
      className="tbos-wallpaper absolute inset-0 overflow-hidden"
      data-image={wallpaper.id === "aurora" ? "off" : "on"}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
      }}
      onContextMenu={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
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
          />
        );
      })}

      {menu ? (
        <div
          role="menu"
          aria-label="Masaüstü menüsü"
          className="tbos-window absolute z-[60] w-56 rounded-xl p-1 shadow-2xl"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MenuItem
            label="Duvar Kâğıdını Değiştir"
            onClick={() => {
              setMenu(null);
              onOpen("wallpaper");
            }}
          />
          <MenuItem
            label="Yeni Klasör"
            onClick={() => {
              setMenu(null);
              void newFolder();
            }}
          />
          <MenuItem
            label="Yenile"
            onClick={() => {
              setMenu(null);
              notifyOk("Masaüstü yenilendi");
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="wa-press block w-full rounded-lg px-3 py-2 text-left text-[13px] text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-accent)_12%,transparent)]"
    >
      {label}
    </button>
  );
}
