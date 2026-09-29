/**
 * CANLI DÜĞÜM AĞ HARİTASI (Canvas 2D)
 * ------------------------------------------------------------------
 * Kristal (eşkenar dörtgen) düğümler ve merkezden akan parçacık
 * darbeleri. Renkler --tb-* değişkenlerinden okunur. Kareler yalnız
 * sekme görünürken çizilir; hareket azaltma tercihinde tek kare çizilir.
 */

import { useEffect, useRef } from "react";

import { useWindowSuspended } from "@/lib/shell/window-sleep";
import { hitTest, layout, type MapHealth, type MapNode } from "@/lib/portal/live";

const TONE_VAR: Record<MapHealth, string> = {
  ok: "--tb-emerald-400",
  warn: "--tb-amber-400",
  error: "--tb-rose-500",
};

export function MeshMap({ nodes, onSelect }: { nodes: MapNode[]; onSelect: (n: MapNode) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ id: string; x: number; y: number }[]>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const sleeping = useWindowSuspended();

  useEffect(() => {
    if (sleeping) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    let last = 0;

    const colors = () => {
      const s = getComputedStyle(canvas);
      const v = (k: string) => s.getPropertyValue(k).trim() || s.color;
      return {
        ok: v(TONE_VAR.ok),
        warn: v(TONE_VAR.warn),
        error: v(TONE_VAR.error),
        line: v("--tb-border"),
        text: v("--tb-muted"),
        pulse: v("--tb-accent"),
      };
    };

    const frame = (t: number) => {
      raf = reduce ? 0 : requestAnimationFrame(frame);
      if (document.hidden || t - last < 16) return;
      last = t;
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const c = colors();
      const list = nodesRef.current;
      const pts = layout(
        list.map((n) => n.id),
        w,
        h,
      );
      pointsRef.current = pts;
      const center = pts[0];
      if (!center) return;

      pts.slice(1).forEach((p, i) => {
        const n = list[i + 1];
        ctx.strokeStyle = c.line;
        ctx.globalAlpha = n.health === "error" ? 0.35 : 0.8;
        ctx.setLineDash(n.health === "error" ? [4, 4] : []);
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.setLineDash([]);
        if (n.health !== "error") {
          // parçacık darbeleri
          for (let k = 0; k < 3; k++) {
            const f = (((t / 1400 + k / 3 + i * 0.17) % 1) + 1) % 1;
            ctx.globalAlpha = 1 - f * 0.6;
            ctx.fillStyle = n.health === "warn" ? c.warn : c.pulse;
            ctx.beginPath();
            ctx.arc(
              center.x + (p.x - center.x) * f,
              center.y + (p.y - center.y) * f,
              2.2,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      });

      ctx.globalAlpha = 1;
      pts.forEach((p, i) => {
        const n = list[i];
        const s = i === 0 ? 13 : 9;
        ctx.fillStyle = c[n.health];
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.75, p.y);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.75, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c.text;
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(n.label.slice(0, 18), p.x, p.y + s + 12);
      });
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sleeping]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Ağ haritası: ${nodes.length} düğüm`}
      className="h-72 w-full cursor-pointer rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)]"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const id = hitTest(pointsRef.current, e.clientX - r.left, e.clientY - r.top);
        const n = id ? nodesRef.current.find((x) => x.id === id) : undefined;
        if (n) onSelect(n);
      }}
    />
  );
}
