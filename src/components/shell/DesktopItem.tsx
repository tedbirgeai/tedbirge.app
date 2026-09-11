/**
 * MASAÜSTÜ ÖĞESİ (uygulama kısayolu veya VFS belgesi)
 * ------------------------------------------------------------------
 * Serbest sürüklenebilir, bırakıldığında ızgaraya oturan simge.
 * Tek tık seçer (Ctrl/Shift ile çoklu seçim), çift tık açar, sağ tık
 * işletim sistemi menüsünü çağırır. Dokunmatikte uzun basma sürükler.
 */

import { useRef, type ReactNode } from "react";

import { metrics, type ViewMode } from "@/lib/shell/desktop-layout";

export type DesktopItemProps = {
  label: string;
  glyph: ReactNode;
  selected: boolean;
  view: ViewMode;
  x: number;
  y: number;
  badge?: ReactNode;
  onSelect: (additive: boolean) => void;
  onOpen: () => void;
  onMenu: (pt: { x: number; y: number }) => void;
  onMove: (pos: { x: number; y: number }) => void;
};

export function DesktopItem({
  label,
  glyph,
  selected,
  view,
  x,
  y,
  badge,
  onSelect,
  onOpen,
  onMenu,
  onMove,
}: DesktopItemProps) {
  const m = metrics(view);
  const drag = useRef<{ dx: number; dy: number; moved: boolean; id: number } | null>(null);
  const lastTap = useRef(0);
  const holdTimer = useRef<number | null>(null);

  const begin = (e: React.PointerEvent<HTMLButtonElement>) => {
    onSelect(e.ctrlKey || e.metaKey || e.shiftKey);
    const start = { dx: e.clientX - x, dy: e.clientY - y, moved: false, id: e.pointerId };
    if (e.pointerType === "mouse") {
      drag.current = start;
      e.currentTarget.setPointerCapture(e.pointerId);
    } else {
      const el = e.currentTarget;
      holdTimer.current = window.setTimeout(() => {
        drag.current = start;
        try {
          el.setPointerCapture(start.id);
        } catch {
          /* işaretçi çoktan bırakılmış olabilir */
        }
      }, 380);
    }
  };

  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const nx = e.clientX - d.dx;
    const ny = e.clientY - d.dy;
    if (Math.abs(nx - x) > 3 || Math.abs(ny - y) > 3) d.moved = true;
    onMove({ x: nx, y: ny });
  };

  const end = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    const d = drag.current;
    drag.current = null;
    if (d?.moved) return;
    // Sürükleme olmadıysa tıklama davranışı: dokunmatik tek dokunuşla açar.
    if (e.pointerType !== "mouse") {
      onOpen();
      return;
    }
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
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
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
      className={`tbos-desk-icon absolute flex flex-col items-center justify-start gap-1.5 rounded-xl px-1.5 py-2 text-center select-none ${
        selected ? "tbos-desk-icon--on" : ""
      }`}
      style={{ left: x, top: y, width: m.w, height: m.h, touchAction: "none" }}
    >
      <span
        className="tbos-desk-glyph relative grid place-items-center rounded-2xl"
        style={{ width: m.glyph, height: m.glyph }}
      >
        {glyph}
        {badge ? <span className="absolute -right-1 -bottom-1">{badge}</span> : null}
      </span>
      <span className="line-clamp-2 min-h-8 w-full text-center text-xs font-medium leading-4 text-[var(--tb-text)] drop-shadow-md">
        {label}
      </span>
    </button>
  );
}
