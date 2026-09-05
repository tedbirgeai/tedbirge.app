/**
 * PENCERE ÇERÇEVESİ (WindowFrame)
 * ------------------------------------------------------------------
 * Sürüklenebilir, sekiz tutamaktan boyutlandırılabilir, odaklandığında
 * öne gelen pencere. Sürükleme/boyutlandırma sırasında gövdedeki
 * `tbos-dragging` sınıfı tüm gömülü çerçevelerin imleci yutmasını
 * engeller; kenara yaklaşıldığında yapışma önizlemesi belirir.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Maximize2, Minus, Minimize2, X } from "lucide-react";

import {
  closeWindow,
  focusWindow,
  minimizeWindow,
  moveWindow,
  placeWindow,
  resizeWindow,
  setWindowBox,
  toggleMaximize,
  type WindowRecord,
} from "@/shell/windows";
import { haptic, snapBoxFor, type SnapBox } from "@/lib/shell/window-snap";

type Edge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: Array<{ edge: Edge; className: string; cursor: string }> = [
  { edge: "n", className: "top-0 right-3 left-3 h-1.5", cursor: "ns-resize" },
  { edge: "s", className: "right-3 bottom-0 left-3 h-1.5", cursor: "ns-resize" },
  { edge: "w", className: "top-3 bottom-3 left-0 w-1.5", cursor: "ew-resize" },
  { edge: "e", className: "top-3 right-0 bottom-3 w-1.5", cursor: "ew-resize" },
  { edge: "nw", className: "top-0 left-0 h-3 w-3", cursor: "nwse-resize" },
  { edge: "ne", className: "top-0 right-0 h-3 w-3", cursor: "nesw-resize" },
  { edge: "sw", className: "bottom-0 left-0 h-3 w-3", cursor: "nesw-resize" },
  { edge: "se", className: "right-0 bottom-0 h-3 w-3", cursor: "nwse-resize" },
];

function setDragging(on: boolean) {
  if (typeof document === "undefined") return;
  document.body.classList.toggle("tbos-dragging", on);
}

export function WindowFrame({ win, children }: { win: WindowRecord; children: ReactNode }) {
  const root = useRef<HTMLDivElement | null>(null);
  /**
   * Sürükleme boyunca React state güncellenmez: konum doğrudan GPU
   * katmanına (`translate3d`) yazılır, ölçüler bir kez okunur ve
   * bırakıldığında tek bir commit yapılır.
   */
  const drag = useRef<{
    dx: number;
    dy: number;
    baseX: number;
    baseY: number;
    x: number;
    y: number;
    raf: number;
    rect: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const size = useRef<{
    edge: Edge;
    px: number;
    py: number;
    x: number;
    y: number;
    w: number;
    h: number;
    raf: number;
  } | null>(null);
  const [snap, setSnap] = useState<SnapBox | null>(null);
  const opener = useRef<Element | null>(null);

  /**
   * ISO 9241-171 odak yönetimi: pencere açılınca odak başlığa taşınır,
   * kapanınca çağıran öğeye döner.
   */
  useEffect(() => {
    opener.current = typeof document === "undefined" ? null : document.activeElement;
    const el = root.current;
    el?.focus({ preventScroll: true });
    return () => {
      const back = opener.current as HTMLElement | null;
      if (back && typeof back.focus === "function" && document.contains(back)) {
        back.focus({ preventScroll: true });
      }
    };
  }, []);

  /** Tab döngüsü aktif pencerenin içinde kalır. */
  const trapTab = useCallback((e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const el = root.current;
    if (!el) return;
    const nodes = Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((n) => n.offsetParent !== null);
    if (!nodes.length) return;
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || active === el)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const area = useCallback(() => {
    const parent = root.current?.parentElement;
    if (!parent) return { left: 0, top: 0, width: 1280, height: 800 };
    const r = parent.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  }, []);

  const onDragStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (win.maximized) return;
      focusWindow(win.id);
      setDragging(true);
      drag.current = {
        dx: e.clientX - win.x,
        dy: e.clientY - win.y,
        baseX: win.x,
        baseY: win.y,
        x: win.x,
        y: win.y,
        raf: 0,
        // Tek sefer düzen okuması; döngüde getBoundingClientRect çağrılmaz.
        rect: area(),
      };
      const el = root.current;
      if (el) el.style.willChange = "transform";
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [win.id, win.maximized, win.x, win.y, area],
  );

  const onDragMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.x = e.clientX - d.dx;
    d.y = e.clientY - d.dy;
    const cx = e.clientX;
    const cy = e.clientY;
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      const el = root.current;
      if (el) {
        el.style.transform = `translate3d(${d.x - d.baseX}px, ${d.y - d.baseY}px, 0)`;
      }
      const box = snapBoxFor(cx, cy, d.rect);
      setSnap((prev) => {
        const same =
          prev &&
          box &&
          prev.x === box.x &&
          prev.y === box.y &&
          prev.w === box.w &&
          prev.h === box.h;
        if (same) return prev;
        if (box && !prev) haptic(6);
        return box;
      });
    });
  }, []);

  const onDragEnd = useCallback(() => {
    const d = drag.current;
    if (d?.raf) cancelAnimationFrame(d.raf);
    drag.current = null;
    setDragging(false);
    const el = root.current;
    if (el) {
      el.style.transform = "";
      el.style.willChange = "";
    }
    if (snap) {
      placeWindow(win.id, snap.x, snap.y, snap.w, snap.h);
      haptic(12);
      setSnap(null);
      return;
    }
    if (d) moveWindow(win.id, d.x, d.y);
  }, [snap, win.id]);

  const onResizeStart = useCallback(
    (edge: Edge) => (e: ReactPointerEvent<HTMLDivElement>) => {
      focusWindow(win.id);
      setDragging(true);
      size.current = {
        edge,
        px: e.clientX,
        py: e.clientY,
        x: win.x,
        y: win.y,
        w: win.w,
        h: win.h,
        raf: 0,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
      e.stopPropagation();
    },
    [win.id, win.x, win.y, win.w, win.h],
  );

  const onResizeMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const s = size.current;
      if (!s) return;
      const cx = e.clientX;
      const cy = e.clientY;
      // Boyutlandırma da kare başına tek commit ile sınırlanır.
      if (s.raf) return;
      s.raf = requestAnimationFrame(() => {
        s.raf = 0;
        const dx = cx - s.px;
        const dy = cy - s.py;
        let { x, y, w, h } = s;
        if (s.edge.includes("e")) w = s.w + dx;
        if (s.edge.includes("s")) h = s.h + dy;
        if (s.edge.includes("w")) {
          w = s.w - dx;
          x = s.x + dx;
        }
        if (s.edge.includes("n")) {
          h = s.h - dy;
          y = s.y + dy;
        }
        if (s.edge.includes("w") || s.edge.includes("n")) setWindowBox(win.id, x, y, w, h);
        else resizeWindow(win.id, w, h);
      });
    },
    [win.id],
  );

  const onResizeEnd = useCallback(() => {
    if (size.current?.raf) cancelAnimationFrame(size.current.raf);
    size.current = null;
    setDragging(false);
  }, []);

  if (win.minimized) return null;

  const style = win.maximized
    ? { left: 0, top: 0, width: "100%", height: "100%", zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <>
      {snap ? (
        <div
          aria-hidden
          className="tbos-snap-preview pointer-events-none absolute rounded-2xl"
          style={{ left: snap.x, top: snap.y, width: snap.w, height: snap.h, zIndex: win.z - 1 }}
        />
      ) : null}

      <div
        ref={root}
        className="tbos-window absolute flex min-h-0 flex-col overflow-hidden rounded-2xl shadow-2xl"
        style={style}
        onPointerDown={() => focusWindow(win.id)}
        onKeyDown={trapTab}
        tabIndex={-1}
        role="dialog"
        aria-label={win.title}
      >
        <div
          className="flex shrink-0 cursor-grab items-center justify-between gap-3 px-3 py-2 active:cursor-grabbing"
          style={{ borderBottom: "1px solid var(--border)", touchAction: "none" }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          onDoubleClick={() => {
            haptic(10);
            toggleMaximize(win.id);
          }}
        >
          <h2 className="truncate font-osmono text-[13px] text-[var(--tb-muted)]">{win.title}</h2>
          <span
            className="flex shrink-0 items-center gap-1"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Küçült"
              onClick={() => {
                haptic();
                const el = root.current;
                if (!el) return minimizeWindow(win.id);
                el.classList.add("tbos-minimizing");
                window.setTimeout(() => minimizeWindow(win.id), 130);
              }}
              className="tbos-winbtn wa-press grid h-8 w-8 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={win.maximized ? "Küçült pencere" : "Tam ekran"}
              onClick={() => {
                haptic();
                toggleMaximize(win.id);
              }}
              className="tbos-winbtn wa-press grid h-8 w-8 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
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
              onClick={() => {
                haptic(12);
                closeWindow(win.id);
              }}
              className="tbos-winbtn wa-press grid h-8 w-8 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-rose-500)]"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </span>
        </div>

        <div className="tbos-scale flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

        {!win.maximized
          ? HANDLES.map((h) => (
              <div
                key={h.edge}
                role="presentation"
                onPointerDown={onResizeStart(h.edge)}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeEnd}
                onPointerCancel={onResizeEnd}
                className={`absolute ${h.className}`}
                style={{ cursor: h.cursor, touchAction: "none" }}
              />
            ))
          : null}
      </div>
    </>
  );
}
