/**
 * MASAÜSTÜ SAYFALAYICI
 * ------------------------------------------------------------------
 * Dar yerleşimde (telefon/tablet) kısayollar yan yana sayfalara bölünür.
 * Sayfa geçişi CSS scroll-snap ile yapılır: parmakla sağa/sola kaydırma
 * doğal ve 60 FPS akıcılıktadır. Sayfa başına en çok 16 ikon (4×4) sığar,
 * daha küçük ekranlarda kapasite ölçülerek azalır.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

import { ICON_H, ICON_W } from "@/components/shell/DesktopIcon";
import { PageDots } from "@/components/shell/PageDots";

const GAP = 24;
const PAD = 24;
export const MAX_PER_PAGE = 16;

/** Ölçülen alana göre sayfa başına ikon kapasitesi (en çok 16). */
export function pageCapacity(width: number, height: number) {
  const cols = Math.max(1, Math.floor((width - PAD * 2 + GAP) / (ICON_W + GAP)));
  const rows = Math.max(1, Math.floor((height - PAD * 2 + GAP) / (ICON_H + GAP)));
  return { cols, perPage: Math.min(MAX_PER_PAGE, cols * rows) };
}

/** Listeyi eşit parçalara böler. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out.length ? out : [[]];
}

export function DesktopPager({
  ids,
  renderIcon,
  onEmptyPointerDown,
}: {
  ids: string[];
  renderIcon: (id: string) => ReactNode;
  onEmptyPointerDown: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(0);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry?.contentRect;
      if (r) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { cols, perPage } = pageCapacity(box.w || 360, box.h || 480);
  const pages = chunk(ids, perPage);
  const active = Math.min(page, pages.length - 1);

  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        ref={host}
        className="tbos-pager min-h-0 flex-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          const w = el.clientWidth || 1;
          const next = Math.round(el.scrollLeft / w);
          if (next !== page) setPage(next);
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onEmptyPointerDown();
        }}
      >
        <div ref={track} className="flex h-full">
          {pages.map((items, i) => (
            <div
              key={i}
              className="tbos-pager-page h-full w-full shrink-0 p-6"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) onEmptyPointerDown();
              }}
            >
              <div
                className="grid content-start justify-start gap-6"
                style={{ gridTemplateColumns: `repeat(${cols}, ${ICON_W}px)` }}
              >
                {items.map((id) => renderIcon(id))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <PageDots
        count={pages.length}
        active={active}
        onSelect={(i) => {
          const el = host.current;
          if (!el) return;
          el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
          setPage(i);
        }}
      />
    </div>
  );
}
