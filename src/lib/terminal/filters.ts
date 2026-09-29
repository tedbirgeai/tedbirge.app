/**
 * Boru hattı metin filtreleri — head, tail, wc, sort, uniq.
 * Saf fonksiyonlardır; girdi önceki aşamanın metin çıktısıdır.
 */

import type { Command, CommandResult } from "./commands";

const lines = (s: string) => (s === "" ? [] : s.replace(/\n$/, "").split("\n"));
const out = (xs: string[]): CommandResult => ({ lines: xs.map((text) => ({ text })), code: 0 });

function count(args: string[], fallback = 10): number {
  const i = args.findIndex((a) => a === "-n");
  const raw = i >= 0 ? args[i + 1] : args.find((a) => /^-?\d+$/.test(a));
  const n = Math.abs(Number(raw ?? fallback));
  return Number.isFinite(n) ? n : fallback;
}

export function head(stdin: string, n = 10): string[] {
  return lines(stdin).slice(0, n);
}
export function tail(stdin: string, n = 10): string[] {
  return n === 0 ? [] : lines(stdin).slice(-n);
}
export function wc(stdin: string, flags: Set<string>): string {
  const ls = lines(stdin);
  const words = stdin.split(/\s+/).filter(Boolean).length;
  if (flags.has("l")) return String(ls.length);
  if (flags.has("w")) return String(words);
  if (flags.has("c")) return String(stdin.length);
  return `${ls.length} ${words} ${stdin.length}`;
}
export function sortLines(stdin: string, flags: Set<string>): string[] {
  const ls = lines(stdin);
  const sorted = flags.has("n")
    ? ls.sort((a, b) => parseFloat(a) - parseFloat(b))
    : ls.sort((a, b) => a.localeCompare(b, "tr"));
  return flags.has("r") ? sorted.reverse() : sorted;
}
export function uniq(stdin: string): string[] {
  return lines(stdin).filter((l, i, arr) => i === 0 || arr[i - 1] !== l);
}

export const FILTER_COMMANDS: Command[] = [
  { name: "head", group: "kabuk", usage: "head [-n N]", summary: "İlk N satırı gösterir", run: ({ stdin, args }) => out(head(stdin, count(args))) },
  { name: "tail", group: "kabuk", usage: "tail [-n N]", summary: "Son N satırı gösterir", run: ({ stdin, args }) => out(tail(stdin, count(args))) },
  { name: "wc", group: "kabuk", usage: "wc [-l|-w|-c]", summary: "Satır/sözcük/karakter sayar", run: ({ stdin, flags }) => out([wc(stdin, flags)]) },
  { name: "sort", group: "kabuk", usage: "sort [-r] [-n]", summary: "Satırları sıralar", run: ({ stdin, flags }) => out(sortLines(stdin, flags)) },
  { name: "uniq", group: "kabuk", usage: "uniq", summary: "Ardışık tekrarları siler", run: ({ stdin }) => out(uniq(stdin)) },
];
