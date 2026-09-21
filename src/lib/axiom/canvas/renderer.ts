/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM ÇİZİM KATMANI
 * ------------------------------------------------------------------
 * Geometri WebGL2 ile çizilir; WebGL2 yoksa aynı sahne 2D bağlamına
 * düşer (düşüş sessiz değildir, kip arayüzde yazılır). Yazılar her
 * durumda üstteki 2D katmanında çizilir. Bütün renkler çalışma anında
 * `--tb-*` token'larından okunur; bu dosyada sabit renk yoktur.
 */

import { buildScene, type Scene, type SceneInput, type Tone } from "@/lib/axiom/canvas/geometry";

export type RenderMode = "webgl2" | "canvas2d";

export type Palette = Record<Tone, [number, number, number, number]>;

const TOKENS: Record<Tone, string> = {
  panel: "--tb-panel-solid",
  accent: "--tb-cyan-400",
  warn: "--tb-rose-400",
  grid: "--tb-bg-soft",
};

/** `#rrggbb`, `#rgb`, `rgb()` ve `rgba()` biçimlerini 0–1 aralığına çevirir. */
export function parseColor(value: string): [number, number, number, number] {
  const v = value.trim();
  if (v.startsWith("#")) {
    const hex = v.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const n = Number.parseInt(full.slice(0, 6), 16);
    if (Number.isNaN(n)) return [0.5, 0.5, 0.5, 1];
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }
  const m = v.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const parts = m[1]
      .split(/[,/\s]+/)
      .filter(Boolean)
      .map(Number);
    const [r = 128, g = 128, b = 128, a = 1] = parts;
    return [r / 255, g / 255, b / 255, Number.isFinite(a) ? a : 1];
  }
  return [0.5, 0.5, 0.5, 1];
}

/** Tema token'larını okuyup paleti üretir. */
export function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const out = {} as Palette;
  for (const tone of Object.keys(TOKENS) as Tone[]) {
    out[tone] = parseColor(style.getPropertyValue(TOKENS[tone]) || "#808080");
  }
  return out;
}

function css(rgba: [number, number, number, number]): string {
  const [r, g, b, a] = rgba;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
}

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 fragColor;
void main() { fragColor = u_color; }`;

type GlProgram = {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  color: WebGLUniformLocation;
};

function initGl(canvas: HTMLCanvasElement): GlProgram | null {
  const gl = canvas.getContext("webgl2", { antialias: false, alpha: true });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
    return sh;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  const buffer = gl.createBuffer();
  const color = gl.getUniformLocation(program, "u_color");
  if (!buffer || !color) return null;
  return { gl, program, buffer, color };
}

export type Renderer = {
  mode: RenderMode;
  /** Yeni durumla tek kare çizer. */
  draw: (input: Omit<SceneInput, "mode" | "w" | "h">) => void;
  resize: () => void;
  dispose: () => void;
};

/**
 * Çizici kurar. `glCanvas` WebGL2 katmanı, `textCanvas` yazı katmanıdır;
 * WebGL2 yoksa iki sahne de `textCanvas` üzerine 2D çizilir.
 */
export function createRenderer(
  host: HTMLElement,
  glCanvas: HTMLCanvasElement,
  textCanvas: HTMLCanvasElement,
): Renderer {
  const glp = initGl(glCanvas);
  const mode: RenderMode = glp ? "webgl2" : "canvas2d";
  let palette = readPalette(host);
  let dpr = 1;

  const resize = () => {
    dpr = Math.min(3, Math.max(1, typeof devicePixelRatio === "number" ? devicePixelRatio : 1));
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    for (const c of [glCanvas, textCanvas]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }
    palette = readPalette(host);
  };

  const drawGl = (scene: Scene, w: number, h: number) => {
    if (!glp) return;
    const { gl, program, buffer, color } = glp;
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const loc = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const r of scene.rects) {
      const x0 = (r.x / w) * 2 - 1;
      const x1 = ((r.x + r.w) / w) * 2 - 1;
      const y0 = 1 - (r.y / h) * 2;
      const y1 = 1 - ((r.y + r.h) / h) * 2;
      const verts = new Float32Array([x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1]);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
      const c = palette[r.tone];
      gl.uniform4f(color, c[0], c[1], c[2], r.tone === "grid" ? 0.55 : c[3]);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  };

  const draw = (input: Omit<SceneInput, "mode" | "w" | "h">) => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    const scene = buildScene({ ...input, w, h, mode: mode === "webgl2" ? "GPU" : "YAZILIM" });
    const ctx = textCanvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }
    if (glp) {
      drawGl(scene, w, h);
    } else if (ctx) {
      for (const r of scene.rects) {
        ctx.globalAlpha = r.tone === "grid" ? 0.55 : 1;
        ctx.fillStyle = css(palette[r.tone]);
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.globalAlpha = 1;
    }
    if (!ctx) return;
    for (const label of scene.labels) {
      ctx.fillStyle = css(palette[label.tone === "panel" ? "accent" : label.tone]);
      ctx.font = `${label.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillText(label.text, label.x, label.y);
    }
  };

  resize();
  return { mode, draw, resize, dispose: () => undefined };
}
