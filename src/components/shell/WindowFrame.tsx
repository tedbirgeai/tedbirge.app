/**
 * PENCERE ÇERÇEVESİ (WindowFrame)
 * ------------------------------------------------------------------
 * Sürüklenebilir, boyutlandırılabilir, odaklandığında öne gelen pencere.
 * Yalnız masaüstünde kullanılır; mobilde kabuk tek pencereyi tam ekran
 * gösterir (bkz. WorkspacePanel).
 */

import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Maximize2, Minus, Minimize2, X } from "lucide-react";

import {
  closeWindow,
  focusWindow,
  minimizeWindow,
  moveWindow,
  resizeWindow,
  toggleMaximize,
  type WindowRecord,
} from "@/shell/windows";

export function WindowFrame({ win, children }: { win: WindowRecord; children: ReactNode }) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const size = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (win.maximized) return;
      focusWindow(win.id);
      drag.current = { dx: e.clientX - win.x, dy: e.clientY - win.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [win.id, win.maximized, win.x, win.y],
  );

  const onDragMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d) return;
      moveWindow(win.id, e.clientX - d.dx, e.clientY - d.dy);
    },
    [win.id],
  );

  const onDragEnd = useCallback(() => {
    drag.current = null;
  }, []);

  const onResizeStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      focusWindow(win.id);
      size.current = { x: e.clientX, y: e.clientY, w: win.w, h: win.h };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    [win.id, win.w, win.h],
  );

  const onResizeMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = size.current;
      if (!s) return;
      resizeWindow(win.id, s.w + (e.clientX - s.x), s.h + (e.clientY - s.y));
    },
    [win.id],
  );

  if (win.minimized) return null;

  const style = win.maximized
    ? { left: 0, top: 0, width: "100%", height: "100%", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <div
      className="tbos-window absolute flex min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl"
      style={style}
      onPointerDown={() => focusWindow(win.id)}
      role="dialog"
      aria-label={win.title}
    >
      <div
        className="flex shrink-0 cursor-grab items-center justify-between gap-3 px-3 py-2 active:cursor-grabbing"
        style={{ borderBottom: "1px solid var(--border)" }}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onDoubleClick={() => toggleMaximize(win.id)}
      >
        <h2 className="truncate font-osmono text-[13px] text-slate-300">{win.title}</h2>
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Küçült"
            onClick={() => minimizeWindow(win.id)}
            className="wa-press grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-slate-100"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={win.maximized ? "Küçült pencere" : "Tam ekran"}
            onClick={() => toggleMaximize(win.id)}
            className="wa-press grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-slate-100"
          >
            {win.maximized ? (
              <Minimize2 className="h-4 w-4" aria-hidden />
            ) : (
              <Maximize2 className="h-4 w-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            aria-label="Kapat"
            onClick={() => closeWindow(win.id)}
            className="wa-press grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:text-rose-400"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      {!win.maximized ? (
        <div
          role="presentation"
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={() => (size.current = null)}
          className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize"
          style={{ background: "linear-gradient(135deg, transparent 50%, var(--border) 50%)" }}
        />
      ) : null}
    </div>
  );
}
