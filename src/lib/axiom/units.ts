/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * BOYUTSAL ANALİZ KATMANI (SI TEMEL BİRİM ÜS MATRİSİ)
 * ------------------------------------------------------------------
 * Her birim, yedi SI temel boyutunun üs vektörüne indirgenir:
 *
 *   [ M (kg), L (m), T (s), I (A), Theta (K), N (mol), J (cd) ]
 *
 * Böylece "100 J = 100 W" ya da "5 kWh = 5 kW" gibi iddialar, hiçbir
 * simgesel çözücüye ihtiyaç duymadan boyut eşitsizliği üzerinden kesin
 * olarak reddedilebilir: enerji [M L² T⁻²] ile güç [M L² T⁻³] asla
 * eşitlenemez.
 *
 * SIFIR GÜNLÜK: bu katman girdi metnini hiçbir yere yazmaz.
 */

import type { AxiomIr } from "@/lib/axiom/lang/axiom-ir";

/** SI temel boyut üs vektörü: [M, L, T, I, Theta, N, J]. */
export type Dimension = readonly [number, number, number, number, number, number, number];

const D = (
  m = 0,
  l = 0,
  t = 0,
  i = 0,
  th = 0,
  n = 0,
  j = 0,
): Dimension => [m, l, t, i, th, n, j] as const;

export const DIMENSIONLESS: Dimension = D();

/** Boyut vektörünün insan okunur etiketi (ör. "M·L²·T⁻²"). */
const SYMBOLS = ["M", "L", "T", "I", "Θ", "N", "J"] as const;
const SUPER: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

export function dimensionLabel(dim: Dimension): string {
  const parts: string[] = [];
  dim.forEach((exp, idx) => {
    if (exp === 0) return;
    const sup =
      exp === 1
        ? ""
        : String(exp)
            .split("")
            .map((ch) => SUPER[ch] ?? ch)
            .join("");
    parts.push(`${SYMBOLS[idx]}${sup}`);
  });
  return parts.length ? parts.join("·") : "boyutsuz";
}

/**
 * Temel ve türev birimlerin boyut sözlüğü. Anahtarlar küçük harf ve
 * ön ek çözüldükten sonraki çekirdek simgedir.
 */
const BASE: Record<string, Dimension> = {
  // Temel birimler
  kg: D(1),
  g: D(1),
  m: D(0, 1),
  s: D(0, 0, 1),
  a: D(0, 0, 0, 1),
  amper: D(0, 0, 0, 1),
  ampere: D(0, 0, 0, 1),
  k: D(0, 0, 0, 0, 1),
  kelvin: D(0, 0, 0, 0, 1),
  mol: D(0, 0, 0, 0, 0, 1),
  cd: D(0, 0, 0, 0, 0, 0, 1),
  // Türev birimler
  j: D(1, 2, -2),
  joule: D(1, 2, -2),
  nm: D(1, 2, -2),
  ev: D(1, 2, -2),
  wh: D(1, 2, -2),
  w: D(1, 2, -3),
  watt: D(1, 2, -3),
  n: D(1, 1, -2),
  newton: D(1, 1, -2),
  pa: D(1, -1, -2),
  bar: D(1, -1, -2),
  v: D(1, 2, -3, -1),
  volt: D(1, 2, -3, -1),
  ohm: D(1, 2, -3, -2),
  c: D(0, 0, 1, 1),
  coulomb: D(0, 0, 1, 1),
  f: D(-1, -2, 4, 2),
  hz: D(0, 0, -1),
  herz: D(0, 0, -1),
};

/** Ondalık ön ekler (büyük/küçük harf ayrımı çözülmüş biçimde). */
const PREFIX = ["k", "m", "g", "t", "p", "n", "u", "µ", "c", "d", "h", "da"];

/** Ön ekli ya da bileşik birim simgesini boyut vektörüne çevirir. */
export function unitDimension(raw: string | null | undefined): Dimension | null {
  if (!raw) return null;
  const sym = raw.trim().toLowerCase().replace(/\.$/, "");
  if (!sym || sym === "%") return null;
  if (BASE[sym]) return BASE[sym];

  // Saat cinsinden enerji/güç birleşimleri: kWh, MWh, Wh, kWs…
  const wh = /^([a-zµ]*)(wh|ws)$/.exec(sym);
  if (wh) return BASE["j"] ?? null;
  const ah = /^([a-zµ]*)(ah)$/.exec(sym);
  if (ah) return BASE["c"] ?? null;

  // Ön ek ayıklama: "kj" → "j", "mw" → "w", "ghz" → "hz".
  for (const p of PREFIX) {
    if (sym.length > p.length && sym.startsWith(p)) {
      const core = sym.slice(p.length);
      if (BASE[core]) return BASE[core];
    }
  }
  return null;
}

export function sameDimension(a: Dimension, b: Dimension): boolean {
  return a.every((exp, idx) => exp === b[idx]);
}

export type DimensionMismatch = {
  leftUnit: string;
  rightUnit: string;
  leftDim: Dimension;
  rightDim: Dimension;
  note: string;
};

/** Metinde eşitlik/denklik iddiası var mı? */
const EQUALITY = /(=|==|eşit\w*|eşdeğer\w*|denk\b|equals?\b|equivalent\b|same as\b)/i;

/**
 * İddiada eşitlenen iki niceliğin boyutları uyuşmuyorsa bunu döndürür.
 * Uyuşmazlık, canlı çözücü olmasa dahi kesin reddetme gerekçesidir.
 */
export function dimensionMismatch(ir: AxiomIr, text: string): DimensionMismatch | null {
  const claimsEquality =
    EQUALITY.test(text) || ir.relations.some((r) => r.op === "=" || r.op === "==" || r.op === "===");
  if (!claimsEquality) return null;

  const known = ir.quantities
    .map((q) => ({ unit: q.unit, dim: unitDimension(q.unit) }))
    .filter((q): q is { unit: string; dim: Dimension } => Boolean(q.unit && q.dim));
  if (known.length < 2) return null;

  const first = known[0];
  if (!first) return null;
  for (const candidate of known.slice(1)) {
    if (sameDimension(first.dim, candidate.dim)) continue;
    return {
      leftUnit: first.unit,
      rightUnit: candidate.unit,
      leftDim: first.dim,
      rightDim: candidate.dim,
      note:
        `Boyut uyuşmazlığı: ${first.unit} [${dimensionLabel(first.dim)}] ile ` +
        `${candidate.unit} [${dimensionLabel(candidate.dim)}] eşitlenemez.`,
    };
  }
  return null;
}
