/**
 * TEDBIRGE SHEETS — hesap tablosu
 * ------------------------------------------------------------------
 * Harfli sütun / numaralı satır başlıklı gerçek hücre ızgarası, formül
 * çubuğu ve çok sayfalı yapı. Hesaplama tamamen cihazda yapılır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";

const COLS = 20;
const ROWS = 60;

type Sheet = { name: string; cells: Record<string, string> };
type Book = { v: 2; sheets: Sheet[] };

export function colName(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

function colIndex(name: string): number {
  return name
    .toUpperCase()
    .split("")
    .reduce((acc, ch) => acc * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
}

/** Eski CSV belgelerini çok sayfalı yapıya yükseltir. */
function parseBook(text: string): Book {
  if (text.trim().startsWith("{")) {
    try {
      const data = JSON.parse(text) as Book;
      if (Array.isArray(data.sheets) && data.sheets.length) {
        return { v: 2, sheets: data.sheets.map((s) => ({ name: s.name, cells: s.cells ?? {} })) };
      }
    } catch {
      /* bozuk belge: boş kitap */
    }
  }
  const cells: Record<string, string> = {};
  text.split("\n").forEach((row, r) => {
    row.split(",").forEach((cell, c) => {
      if (cell) cells[`${colName(c)}${r + 1}`] = cell;
    });
  });
  return { v: 2, sheets: [{ name: "Sheet1", cells }] };
}

/** Formül değerlendirici: SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND + aritmetik. */
export function evaluate(
  raw: string,
  cells: Record<string, string>,
  seen: Set<string> = new Set(),
): string {
  if (!raw.startsWith("=")) return raw;
  const body = raw.slice(1).trim();

  const valueOf = (ref: string): number => {
    if (seen.has(ref)) return 0;
    const next = new Set(seen);
    next.add(ref);
    const v = cells[ref.toUpperCase()] ?? "";
    const out = v.startsWith("=") ? evaluate(v, cells, next) : v;
    return Number(out) || 0;
  };

  const rangeValues = (from: string, to: string): number[] => {
    const m1 = /^([A-Z]+)(\d+)$/.exec(from.toUpperCase());
    const m2 = /^([A-Z]+)(\d+)$/.exec(to.toUpperCase());
    if (!m1 || !m2) return [];
    const c1 = colIndex(m1[1]!);
    const c2 = colIndex(m2[1]!);
    const r1 = Number(m1[2]);
    const r2 = Number(m2[2]);
    const out: number[] = [];
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
        out.push(valueOf(`${colName(c)}${r}`));
    return out;
  };

  const agg = /^(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i.exec(body);
  if (agg) {
    const fn = agg[1]!.toUpperCase();
    const vals = rangeValues(agg[2]!, agg[3]!);
    if (fn === "COUNT") return String(vals.filter((v) => v !== 0).length);
    if (!vals.length) return "0";
    if (fn === "SUM") return String(vals.reduce((a, b) => a + b, 0));
    if (fn === "AVERAGE" || fn === "AVG")
      return String(vals.reduce((a, b) => a + b, 0) / vals.length);
    if (fn === "MIN") return String(Math.min(...vals));
    return String(Math.max(...vals));
  }

  const round = /^ROUND\((.+),\s*(\d+)\)$/i.exec(body);
  if (round) {
    const inner = evaluate(`=${round[1]}`, cells, seen);
    const digits = Number(round[2]);
    const n = Number(inner);
    return Number.isFinite(n) ? n.toFixed(digits) : "#HATA";
  }

  const cond = /^IF\((.+?)(<=|>=|<>|=|<|>)(.+?),(.+?),(.+)\)$/i.exec(body);
  if (cond) {
    const left = Number(evaluate(`=${cond[1]}`, cells, seen));
    const right = Number(evaluate(`=${cond[3]}`, cells, seen));
    const op = cond[2]!;
    const ok =
      op === "=" ? left === right
      : op === "<>" ? left !== right
      : op === "<" ? left < right
      : op === ">" ? left > right
      : op === "<=" ? left <= right
      : left >= right;
    const branch = (ok ? cond[4] : cond[5])!.trim();
    return /^["'].*["']$/.test(branch)
      ? branch.slice(1, -1)
      : evaluate(`=${branch}`, cells, seen);
  }

  const expr = body.replace(/[A-Z]+\d+/gi, (ref) => String(valueOf(ref)));
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
  const book = useMemo(() => parseBook(editor.text), [editor.text]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [active, setActive] = useState("A1");
  const [draft, setDraft] = useState("");
  const barRef = useRef<HTMLInputElement>(null);

  const sheet = book.sheets[Math.min(sheetIndex, book.sheets.length - 1)]!;
  const cells = sheet.cells;

  useEffect(() => setDraft(cells[active] ?? ""), [active, cells]);

  const writeBook = useCallback(
    (next: Book) => editor.setText(JSON.stringify(next)),
    [editor],
  );

  const setCell = useCallback(
    (ref: string, value: string) => {
      const sheets = book.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: { ...s.cells, [ref]: value } } : s,
      );
      writeBook({ v: 2, sheets });
    },
    [book, sheetIndex, writeBook],
  );

  const move = (dc: number, dr: number) => {
    const m = /^([A-Z]+)(\d+)$/.exec(active)!;
    const c = Math.min(COLS - 1, Math.max(0, colIndex(m[1]!) + dc));
    const r = Math.min(ROWS, Math.max(1, Number(m[2]) + dr));
    setActive(`${colName(c)}${r}`);
  };

  const tabs = [
    {
      id: "giris",
      label: "Giriş",
      content: (
        <>
          <RibbonGroup label="Sayfa">
            <ToolButton
              onClick={() =>
                writeBook({
                  v: 2,
                  sheets: [...book.sheets, { name: `Sheet${book.sheets.length + 1}`, cells: {} }],
                })
              }
              icon={<Plus className="h-4 w-4" />}
              label="Sayfa ekle"
            />
          </RibbonGroup>
          <RibbonGroup label="Hücre">
            <ToolButton onClick={() => setCell(active, "")} label="Temizle" />
            <ToolButton onClick={() => setCell(active, "=SUM(A1:A10)")} label="=SUM" />
            <ToolButton onClick={() => setCell(active, "=AVERAGE(A1:A10)")} label="=AVERAGE" />
          </RibbonGroup>
        </>
      ),
    },
  ];

  return (
    <OfficeShell
      kind="sheets"
      editor={editor}
      tabs={tabs}
      status={<span>{sheet.name}</span>}
      sidebar={false}
    >
      {/* Formül çubuğu */}
      <div
        className="flex items-center gap-2 border-b px-2 py-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <span
          className="w-16 rounded-md px-2 py-1 text-center font-osmono text-[12px] text-[var(--tb-text)]"
          style={{ border: "1px solid var(--border)" }}
        >
          {active}
        </span>
        <span className="font-osmono text-[13px] text-[var(--tb-muted)]">fx</span>
        <input
          ref={barRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setCell(active, draft);
              move(0, 1);
            }
          }}
          onBlur={() => setCell(active, draft)}
          aria-label="Formül çubuğu"
          placeholder="Değer veya =SUM(A1:A10)"
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-[13px] text-[var(--tb-text)] outline-none"
          style={{ border: "1px solid var(--border)" }}
        />
      </div>

      {/* Hücre ızgarası */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="border-collapse text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                className="sticky left-0 z-10 w-10 bg-[var(--tb-panel-solid)]"
                style={{ border: "1px solid var(--border)" }}
              />
              {Array.from({ length: COLS }).map((_, c) => (
                <th
                  key={c}
                  className="min-w-24 bg-[var(--tb-panel-solid)] px-2 py-1 font-osmono text-[11px] font-normal text-[var(--tb-muted)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {colName(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ROWS }).map((_, r) => (
              <tr key={r}>
                <th
                  className="sticky left-0 z-10 bg-[var(--tb-panel-solid)] px-1 text-right font-osmono text-[11px] font-normal text-[var(--tb-muted)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {r + 1}
                </th>
                {Array.from({ length: COLS }).map((_, c) => {
                  const ref = `${colName(c)}${r + 1}`;
                  const raw = cells[ref] ?? "";
                  const shown = raw.startsWith("=") ? evaluate(raw, cells) : raw;
                  const on = ref === active;
                  return (
                    <td key={c} style={{ border: "1px solid var(--border)" }} className="p-0">
                      <button
                        type="button"
                        onClick={() => setActive(ref)}
                        onDoubleClick={() => barRef.current?.focus()}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowRight") move(1, 0);
                          else if (e.key === "ArrowLeft") move(-1, 0);
                          else if (e.key === "ArrowDown") move(0, 1);
                          else if (e.key === "ArrowUp") move(0, -1);
                          else if (e.key === "Delete") setCell(ref, "");
                          else return;
                          e.preventDefault();
                        }}
                        aria-label={`Hücre ${ref}`}
                        className={`h-7 w-full min-w-24 truncate px-2 text-left ${
                          on
                            ? "bg-[color-mix(in_srgb,var(--tb-accent)_22%,transparent)] text-[var(--tb-text)]"
                            : "text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-text)_5%,transparent)]"
                        }`}
                      >
                        {shown}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sayfa sekmeleri */}
      <div
        className="flex items-center gap-1 border-t px-2 py-1"
        style={{ borderColor: "var(--border)" }}
      >
        {book.sheets.map((s, i) => (
          <span key={s.name + i} className="flex items-center">
            <button
              type="button"
              onClick={() => setSheetIndex(i)}
              onDoubleClick={() => {
                const name = window.prompt("Sayfa adı", s.name);
                if (!name) return;
                writeBook({
                  v: 2,
                  sheets: book.sheets.map((x, j) => (j === i ? { ...x, name } : x)),
                });
              }}
              className={`rounded-t-md px-3 py-1 text-[12px] ${
                i === sheetIndex
                  ? "bg-[color-mix(in_srgb,var(--tb-accent)_18%,transparent)] text-[var(--tb-text)]"
                  : "text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
              }`}
            >
              {s.name}
            </button>
            {book.sheets.length > 1 ? (
              <button
                type="button"
                aria-label={`${s.name} sayfasını sil`}
                onClick={() => {
                  writeBook({ v: 2, sheets: book.sheets.filter((_, j) => j !== i) });
                  setSheetIndex(0);
                }}
                className="px-1 text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
              >
                <X className="h-3 w-3" />
              </button>
            ) : null}
          </span>
        ))}
        <button
          type="button"
          aria-label="Sayfa ekle"
          onClick={() =>
            writeBook({
              v: 2,
              sheets: [...book.sheets, { name: `Sheet${book.sheets.length + 1}`, cells: {} }],
            })
          }
          className="ml-1 rounded-md px-2 py-1 text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </OfficeShell>
  );
}
