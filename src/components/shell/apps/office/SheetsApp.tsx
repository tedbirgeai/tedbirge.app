/**
 * TEDBIRGE SHEETS — gömülü hesap tablosu
 * CSV olarak şifreli VFS katmanına kaydeder; formüller yerel hesaplanır.
 */

import { useMemo } from "react";

import { OfficeFrame, useOfficeEditor } from "./OfficeFrame";

const COLS = 8;
const ROWS = 20;
const LETTERS = "ABCDEFGH".split("");

function parse(text: string): string[][] {
  const rows = text ? text.split("\n").map((r) => r.split(",")) : [];
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => rows[r]?.[c] ?? ""),
  );
}

function serialize(grid: string[][]): string {
  return grid
    .map((r) => r.join(","))
    .join("\n")
    .replace(/(?:\n,*)+$/, "");
}

function cellRef(ref: string, grid: string[][]): number {
  const m = /^([A-H])(\d{1,2})$/.exec(ref.trim().toUpperCase());
  if (!m) return 0;
  const c = LETTERS.indexOf(m[1]!);
  const r = Number(m[2]) - 1;
  return Number(grid[r]?.[c] ?? 0) || 0;
}

/** =SUM(A1:A5) · =AVG(...) · =A1+A2 gibi basit ifadeleri hesaplar. */
function evaluate(raw: string, grid: string[][]): string {
  if (!raw.startsWith("=")) return raw;
  const body = raw.slice(1).trim();
  const range = /^(SUM|AVG|MIN|MAX)\(([A-H]\d{1,2}):([A-H]\d{1,2})\)$/i.exec(body);
  if (range) {
    const [, fn, from, to] = range;
    const c1 = LETTERS.indexOf(from![0]!.toUpperCase());
    const c2 = LETTERS.indexOf(to![0]!.toUpperCase());
    const r1 = Number(from!.slice(1)) - 1;
    const r2 = Number(to!.slice(1)) - 1;
    const vals: number[] = [];
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
        vals.push(Number(grid[r]?.[c] ?? 0) || 0);
    if (!vals.length) return "0";
    const f = fn!.toUpperCase();
    if (f === "SUM") return String(vals.reduce((a, b) => a + b, 0));
    if (f === "AVG") return String(vals.reduce((a, b) => a + b, 0) / vals.length);
    if (f === "MIN") return String(Math.min(...vals));
    return String(Math.max(...vals));
  }
  const expr = body.replace(/[A-H]\d{1,2}/gi, (ref) => String(cellRef(ref, grid)));
  if (!/^[-+*/(). 0-9]+$/.test(expr)) return "#HATA";
  try {
    const out = new Function(`"use strict";return (${expr});`)() as unknown;
    return typeof out === "number" && Number.isFinite(out) ? String(out) : "#HATA";
  } catch {
    return "#HATA";
  }
}

export function SheetsApp() {
  const editor = useOfficeEditor("sheets");
  const grid = useMemo(() => parse(editor.text), [editor.text]);

  const setCell = (r: number, c: number, v: string) => {
    const next = grid.map((row) => [...row]);
    next[r]![c] = v.replace(/,/g, ";");
    editor.setText(serialize(next));
  };

  return (
    <OfficeFrame kind="sheets" editor={editor}>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <table className="border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="w-8" />
              {LETTERS.map((l) => (
                <th key={l} className="px-2 py-1 text-[var(--tb-muted)]">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, r) => (
              <tr key={r}>
                <td className="px-1 text-right text-[var(--tb-muted)]">{r + 1}</td>
                {row.map((cell, c) => (
                  <td key={c} style={{ border: "1px solid var(--border)" }}>
                    <input
                      value={cell}
                      onChange={(e) => setCell(r, c, e.target.value)}
                      aria-label={`Hücre ${LETTERS[c]}${r + 1}`}
                      title={cell.startsWith("=") ? evaluate(cell, grid) : undefined}
                      className="w-24 bg-transparent px-2 py-1 text-[var(--tb-text)] outline-none focus:bg-emerald-500/10"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p
        className="border-t p-2 text-[11px] text-[var(--tb-muted)]"
        style={{ borderColor: "var(--border)" }}
      >
        Formüller: =SUM(A1:A5), =AVG(A1:B3), =A1+A2 · sonuç hücrenin üzerine gelince görünür
      </p>
    </OfficeFrame>
  );
}
