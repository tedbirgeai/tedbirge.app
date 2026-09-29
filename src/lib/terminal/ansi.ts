/**
 * ANSI SGR ayrıştırıcı — metni biçimli parçalara böler.
 * Çıktı düz veridir; arayüz bunu span olarak çizer, HTML enjekte edilmez.
 */

export type AnsiStyle = { fg?: string; bg?: string; bold?: boolean; dim?: boolean; italic?: boolean; underline?: boolean };
export type AnsiSpan = { text: string; style: AnsiStyle };

/** 16 temel renk — tema değişkenlerine eşlenir. */
const BASE = [
  "var(--tb-bg)", "var(--tb-danger)", "var(--tb-ok)", "var(--tb-warn)",
  "var(--tb-accent)", "var(--tb-accent-2, var(--tb-accent))", "var(--tb-info, var(--tb-accent))", "var(--tb-text)",
];

function color256(n: number): string {
  if (n < 8) return BASE[n]!;
  if (n < 16) return `color-mix(in srgb, ${BASE[n - 8]} 70%, white)`;
  if (n < 232) {
    const i = n - 16;
    const s = (v: number) => (v === 0 ? 0 : 55 + v * 40);
    return `rgb(${s(Math.floor(i / 36))} ${s(Math.floor(i / 6) % 6)} ${s(i % 6)})`;
  }
  const g = 8 + (n - 232) * 10;
  return `rgb(${g} ${g} ${g})`;
}

// eslint-disable-next-line no-control-regex
const SGR = /\u001b\[([0-9;]*)m/g;

export function parseAnsi(input: string): AnsiSpan[] {
  const spans: AnsiSpan[] = [];
  let style: AnsiStyle = {};
  let last = 0;
  const push = (t: string) => {
    if (t) spans.push({ text: t, style: { ...style } });
  };
  for (const m of input.matchAll(SGR)) {
    push(input.slice(last, m.index));
    last = (m.index ?? 0) + m[0].length;
    const codes = (m[1] || "0").split(";").map(Number);
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i]!;
      if (c === 0) style = {};
      else if (c === 1) style.bold = true;
      else if (c === 2) style.dim = true;
      else if (c === 3) style.italic = true;
      else if (c === 4) style.underline = true;
      else if (c === 22) { style.bold = false; style.dim = false; }
      else if (c === 39) style.fg = undefined;
      else if (c === 49) style.bg = undefined;
      else if (c >= 30 && c <= 37) style.fg = color256(c - 30);
      else if (c >= 90 && c <= 97) style.fg = color256(c - 90 + 8);
      else if (c >= 40 && c <= 47) style.bg = color256(c - 40);
      else if (c >= 100 && c <= 107) style.bg = color256(c - 100 + 8);
      else if ((c === 38 || c === 48) && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
        const col = color256(Math.min(255, codes[i + 2]!));
        if (c === 38) style.fg = col;
        else style.bg = col;
        i += 2;
      }
    }
  }
  push(input.slice(last));
  return spans;
}

export const stripAnsi = (s: string) => s.replace(SGR, "");
