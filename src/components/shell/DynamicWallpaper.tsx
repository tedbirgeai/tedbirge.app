/**
 * CANLI DUVAR KÂĞIDI (Canvas 2D)
 * ------------------------------------------------------------------
 * "Canlı Akış": süzülen radyal renk kütleleri (mesh gradyan).
 * "Canlı Parçacık": yavaş yükselen ışık noktaları.
 * Renkler --tb-* değişkenlerinden; saatin gün evresine göre yoğunluk
 * değişir. 30 FPS sınırı, DPR ≤ 1.5; sekme gizliyken, tam ekran pencere
 * varken ve hareket azaltma tercihinde çizim durur.
 */

import { useEffect, useRef } from "react";

import { dayPhase, type DayPhase } from "@/lib/ui/wallpaper";

const PHASE: Record<DayPhase, { glow: number; speed: number }> = {
  gunduz: { glow: 0.55, speed: 1 },
  aksam: { glow: 0.7, speed: 0.8 },
  gece: { glow: 0.4, speed: 0.55 },
};

export function DynamicWallpaper({ kind }: { kind: "live-flow" | "live-particles" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let raf = 0;
    let last = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const v = (k: string, f: string) => s.getPropertyValue(k).trim() || f;
      return {
        bg: v("--tb-bg", "black"),
        soft: v("--tb-bg-soft", "black"),
        accent: v("--tb-accent", "teal"),
        glow: v("--tb-glow", v("--tb-accent", "teal")),
        text: v("--tb-text", "white"),
      };
    };
    let colors = read();
    const themeObs = new MutationObserver(() => (colors = read()));
    themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const blobs = Array.from({ length: 4 }, (_, i) => ({
      a: i * 1.7,
      r: 0.35 + (i % 2) * 0.15,
      c: i % 2 ? "accent" : "glow",
    }));
    const dots = Array.from({ length: 70 }, (_, i) => ({
      x: (i * 97) % 100 / 100,
      y: ((i * 53) % 100) / 100,
      s: 0.6 + ((i * 31) % 10) / 6,
      v: 0.004 + ((i * 17) % 10) / 2500,
    }));

    let t = 0;
    const draw = () => {
      const phase = PHASE[dayPhase(new Date().getHours())];
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, colors.bg);
      g.addColorStop(1, colors.soft);
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      if (kind === "live-flow") {
        ctx.globalCompositeOperation = "lighter";
        for (const b of blobs) {
          const x = w * (0.5 + 0.38 * Math.cos(t * 0.00012 * phase.speed + b.a));
          const y = h * (0.5 + 0.34 * Math.sin(t * 0.00009 * phase.speed + b.a * 1.3));
          const rad = Math.max(w, h) * b.r;
          const rg = ctx.createRadialGradient(x, y, 0, x, y, rad);
          rg.addColorStop(0, b.c === "accent" ? colors.accent : colors.glow);
          rg.addColorStop(1, "transparent");
          ctx.globalAlpha = phase.glow * 0.5;
          ctx.fillStyle = rg;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = "source-over";
      } else {
        ctx.fillStyle = colors.accent;
        for (const d of dots) {
          d.y -= d.v * phase.speed * 0.06;
          if (d.y < -0.02) d.y = 1.02;
          const x = (d.x + 0.02 * Math.sin(t * 0.0004 + d.s * 5)) * w;
          ctx.globalAlpha = phase.glow * (0.35 + 0.35 * Math.sin(t * 0.001 + d.s * 3));
          ctx.beginPath();
          ctx.arc(x, d.y * h, d.s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const paused = () =>
      document.hidden || !!document.querySelector('.tbos-window[data-maximized="true"]');

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 33 || paused()) return;
      t += last ? Math.min(now - last, 100) : 33;
      last = now;
      draw();
    };
    if (reduce) draw();
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObs.disconnect();
    };
  }, [kind]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-testid="dynamic-wallpaper"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
