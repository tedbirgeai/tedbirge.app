/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * PARAMETRİK ÇİZİM MATRİSİ
 * ------------------------------------------------------------------
 * Arayüz kutuları ağır DOM yerine koordinat matrisiyle çizilir.
 * Burada yalnız geometri üretilir; renkler çağıran katmanda `--tb-*`
 * token'larından okunur, bu dosyada hiçbir sabit renk yoktur.
 */

export type Rect = { x: number; y: number; w: number; h: number; tone: Tone };
export type Tone = "panel" | "accent" | "warn" | "grid";
export type Label = { x: number; y: number; text: string; size: number; tone: Tone };

export type SceneInput = {
  w: number;
  h: number;
  /** Sanal RAM doluluk oranı (0–1). */
  ratio: number;
  /** Saniyedeki kare sayısı. */
  fps: number;
  /** Faz 1 durum satırı. */
  status: string;
  /** Çizim kipi etiketi. */
  mode: string;
};

export type Scene = { rects: Rect[]; labels: Label[] };

/** Ekran ölçülerine göre deterministik sahne üretir. */
export function buildScene(input: SceneInput): Scene {
  const { w, h } = input;
  const pad = Math.max(12, Math.round(Math.min(w, h) * 0.04));
  const rects: Rect[] = [];
  const labels: Label[] = [];

  // Arkaplan ızgarası: sabit adımlı, ekrana göre ölçeklenir.
  const step = Math.max(28, Math.round(w / 28));
  for (let x = pad; x < w - pad; x += step) {
    rects.push({ x, y: pad, w: 1, h: Math.max(0, h - pad * 2), tone: "grid" });
  }
  for (let y = pad; y < h - pad; y += step) {
    rects.push({ x: pad, y, w: Math.max(0, w - pad * 2), h: 1, tone: "grid" });
  }

  // Üst gösterge paneli.
  const headH = Math.max(52, Math.round(h * 0.16));
  rects.push({ x: pad, y: pad, w: Math.max(0, w - pad * 2), h: headH, tone: "panel" });
  labels.push({
    x: pad + 14,
    y: pad + 24,
    text: `AXIOM ÇEKİRDEK — ${input.mode}`,
    size: 13,
    tone: "accent",
  });
  labels.push({
    x: pad + 14,
    y: pad + 44,
    text: input.status,
    size: 11,
    tone: "panel",
  });
  labels.push({
    x: Math.max(pad + 14, w - pad - 86),
    y: pad + 24,
    text: `${Math.round(input.fps)} FPS`,
    size: 12,
    tone: "accent",
  });

  // Bellek çubuğu: eşik üstünde uyarı tonuna geçer.
  const barY = pad + headH + pad;
  const barW = Math.max(0, w - pad * 2);
  const barH = 10;
  rects.push({ x: pad, y: barY, w: barW, h: barH, tone: "panel" });
  const fill = Math.max(0, Math.min(1, input.ratio));
  rects.push({
    x: pad,
    y: barY,
    w: Math.round(barW * fill),
    h: barH,
    tone: fill >= 0.8 ? "warn" : "accent",
  });
  labels.push({
    x: pad,
    y: barY + barH + 16,
    text: `Sanal RAM doluluğu: %${Math.round(fill * 100)} (sert sınır 50 MB)`,
    size: 11,
    tone: "panel",
  });

  return { rects, labels };
}
