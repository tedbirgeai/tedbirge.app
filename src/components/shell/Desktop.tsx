/**
 * MASAÜSTÜ YÜZEYİ
 * ------------------------------------------------------------------
 * Duvar kâğıdı + serbest sürüklenebilir kısayol ikonları. Kayıtlı konumu
 * olmayan ikonlar otomatik ızgaraya dizilir; dar ekranlarda sürükleme
 * kapatılır ve tek dokunuş uygulamayı açar.
 */

import { useState } from "react";

import { DesktopIcon, ICON_H, ICON_W } from "@/components/shell/DesktopIcon";
import { catalogApp, useDesktopState } from "@/shell/installed";

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

  const perColumn = Math.max(1, Math.floor((columnsHeight - 24) / ICON_H));

  return (
    <div
      className="tbos-wallpaper absolute inset-0 overflow-hidden"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) setSelected(null);
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
    </div>
  );
}
