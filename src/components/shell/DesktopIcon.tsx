/**
 * MASAÜSTÜ KISAYOLU
 * ------------------------------------------------------------------
 * Serbest sürüklenebilir ikon: tek tık seçer, çift tık (mobilde tek
 * dokunuş) uygulamayı pencere olarak açar. Konum sürükleme bitince
 * kalıcı mağazaya yazılır.
 */

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { AppIcon } from "@/components/shell/app-icons";
import { setIconPos } from "@/shell/installed";

export const ICON_W = 92;
export const ICON_H = 96;

export function DesktopIcon({
  id,
  label,
  x,
  y,
  selected,
  draggable,
  onSelect,
  onOpen,
  onMenu,
}: {
  id: string;
  label: string;
  x: number;
  y: number;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onMenu?: (pt: { x: number; y: number }) => void;
}) {
  const start = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(
    null,
  );
  const lastTap = useRef(0);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onDown = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      onSelect();
      if (!draggable) return;
      // Yakalama burada KURULMAZ: erken pointer capture tıklama/çift tıklama
      // eşleşmesini bozup ikonu "ölü" gösteriyordu. Yalnız gerçek sürüklemede kurulur.
      start.current = { px: e.clientX, py: e.clientY, x, y, moved: false };
    },
    [draggable, onSelect, x, y],
  );

  const onMove = useCallback((e: ReactPointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!s.moved && Math.hypot(dx, dy) < 4) return;
    if (!s.moved) {
      s.moved = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* yakalama desteklenmiyorsa sürükleme yine çalışır */
      }
    }
    setPos({ x: Math.max(0, s.x + dx), y: Math.max(0, s.y + dy) });
  }, []);

  const onUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const s = start.current;
      start.current = null;
      if (s?.moved) {
        if (pos) setIconPos(id, pos);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* zaten serbest */
        }
        setPos(null);
        lastTap.current = 0;
        return;
      }
      setPos(null);
      if (!draggable) return; // dokunmatik: açılış onClick ile
      // Masaüstü: 400 ms içindeki ikinci tıklama uygulamayı açar.
      const now = Date.now();
      if (now - lastTap.current < 400) {
        lastTap.current = 0;
        onOpen();
      } else {
        lastTap.current = now;
      }
    },
    [draggable, id, onOpen, pos],
  );

  const live = pos ?? { x, y };

  return (
    <button
      type="button"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onClick={() => {
        if (!draggable) onOpen();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const host = e.currentTarget.offsetParent as HTMLElement | null;
        const r = host?.getBoundingClientRect();
        onMenu?.({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
      }}
      title={label}
      className={`tbos-desk-icon absolute flex flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center select-none ${
        selected ? "tbos-desk-icon--on" : ""
      }`}
      style={{ left: live.x, top: live.y, width: ICON_W, touchAction: "none" }}
    >

      <span className="tbos-desk-glyph grid h-12 w-12 place-items-center rounded-2xl">
        <AppIcon id={id} className="h-6 w-6" />
      </span>
      <span className="line-clamp-2 text-[12px] leading-tight font-medium text-[var(--tb-text)]">
        {label}
      </span>
    </button>
  );
}
