/**
 * MASAÜSTÜ ÖĞESİ (uygulama kısayolu veya VFS belgesi)
 * ------------------------------------------------------------------
 * Akış tabanlı ızgarada duran simge. Tek tık seçer, çift tık açar,
 * sağ tık işletim sistemi menüsünü çağırır. Mutlak konum kullanılmaz.
 */

import { useRef, type MouseEvent, type ReactNode } from "react";

export type DesktopItemProps = {
  label: string;
  glyph: ReactNode;
  selected: boolean;
  badge?: ReactNode;
  itemKey?: string;
  onSelect: (additive: boolean) => void;
  onOpen: () => void;
  onMenu: (pt: { x: number; y: number }) => void;
};

export function DesktopItem({
  label,
  glyph,
  selected,
  badge,
  itemKey,
  onSelect,
  onOpen,
  onMenu,
}: DesktopItemProps) {
  const lastTap = useRef(0);

  const click = (e: MouseEvent<HTMLButtonElement>) => {
    onSelect(e.ctrlKey || e.metaKey || e.shiftKey);
    const now = Date.now();
    if (now - lastTap.current < 400) {
      lastTap.current = 0;
      onOpen();
      return;
    }
    lastTap.current = now;
  };

  return (
    <button
      type="button"
      data-desktop-item="1"
      data-desktop-key={itemKey}
      data-selected={selected ? "true" : "false"}
      aria-pressed={selected}
      onClick={click}
      onDoubleClick={(e) => {
        e.preventDefault();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const host = e.currentTarget.closest(".tbos-wallpaper") as HTMLElement | null;
        const r = host?.getBoundingClientRect();
        onSelect(false);
        onMenu({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
      }}
      title={label}
      className="flex flex-col items-center justify-start w-[96px] group cursor-pointer relative z-10"
    >
      <span className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-2 shadow-lg group-hover:scale-105 transition-transform">
        {glyph}
        {badge ? <span className="absolute -right-1 -bottom-1">{badge}</span> : null}
      </span>
      <span className="tbos-item-label text-[11px] text-center font-medium leading-tight line-clamp-2 w-full px-1 drop-shadow-sm break-words overflow-hidden">
        {label}
      </span>
    </button>
  );
}
