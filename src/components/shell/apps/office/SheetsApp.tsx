/**
 * TEDBIRGE SHEETS — hesap tablosu
 * ------------------------------------------------------------------
 * Harfli sütun / numaralı satır başlıklı gerçek hücre ızgarası, formül
 * çubuğu ve çok sayfalı yapı. Hesaplama tamamen cihazda yapılır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";
import { colIndex, colName, evaluate, fillSeries, parseRef } from "./formula";
import { SheetChart, type ChartKind } from "./SheetChart";

export { colName, evaluate };

type Rect = { c1: number; r1: number; c2: number; r2: number };
const rectOf = (a: string, b: string): Rect => {
  const p = parseRef(a)!;
  const q = parseRef(b)!;
  return { c1: Math.min(p.c, q.c), r1: Math.min(p.r, q.r), c2: Math.max(p.c, q.c), r2: Math.max(p.r, q.r) };
};
const inRect = (x: Rect, c: number, r: number) => c >= x.c1 && c <= x.c2 && r >= x.r1 && r <= x.r2;

const COLS = 20;
const ROWS = 60;

type Sheet = { name: string; cells: Record<string, string> };
type Book = { v: 2; sheets: Sheet[] };

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

export function SheetsApp() {
  const editor = useOfficeEditor("sheets");
  const book = useMemo(() => parseBook(editor.text), [editor.text]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [active, setActive] = useState("A1");
  const [draft, setDraft] = useState("");
  const barRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState("A1");
  const [selecting, setSelecting] = useState(false);
  const [fillTo, setFillTo] = useState<string | null>(null);
  const [chart, setChart] = useState<{ kind: ChartKind; rect: Rect } | null>(null);
  const sel = rectOf(anchor, active);

  const sheet = book.sheets[Math.min(sheetIndex, book.sheets.length - 1)]!;
  const cells = sheet.cells;

  useEffect(() => setDraft(cells[active] ?? ""), [active, cells]);

  const writeBook = useCallback((next: Book) => editor.setText(JSON.stringify(next)), [editor]);

  const setCell = useCallback(
    (ref: string, value: string) => {
      const sheets = book.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: { ...s.cells, [ref]: value } } : s,
      );
      writeBook({ v: 2, sheets });
    },
    [book, sheetIndex, writeBook],
  );

  const setMany = useCallback(
    (patch: Record<string, string>) => {
      const sheets = book.sheets.map((s, i) =>
        i === sheetIndex ? { ...s, cells: { ...s.cells, ...patch } } : s,
      );
      writeBook({ v: 2, sheets });
    },
    [book, sheetIndex, writeBook],
  );

  /** Doldurma tutamacı bırakıldığında seçimi hedefe kadar çoğaltır. */
  const applyFill = (target: string) => {
    const t = parseRef(target);
    if (!t) return;
    const patch: Record<string, string> = {};
    if (t.r > sel.r2) {
      for (let c = sel.c1; c <= sel.c2; c++) {
        const src = [];
        for (let r = sel.r1; r <= sel.r2; r++) src.push(cells[`${colName(c)}${r}`] ?? "");
        fillSeries(src, t.r - sel.r2, "down").forEach((v, i) => (patch[`${colName(c)}${sel.r2 + 1 + i}`] = v));
      }
    } else if (t.c > sel.c2) {
      for (let r = sel.r1; r <= sel.r2; r++) {
        const src = [];
        for (let c = sel.c1; c <= sel.c2; c++) src.push(cells[`${colName(c)}${r}`] ?? "");
        fillSeries(src, t.c - sel.c2, "right").forEach((v, i) => (patch[`${colName(sel.c2 + 1 + i)}${r}`] = v));
      }
    }
    if (Object.keys(patch).length) setMany(patch);
  };

  useEffect(() => {
    const up = () => {
      setSelecting(false);
      setFillTo((f) => {
        if (f) applyFill(f);
        return null;
      });
    };
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  });

  const rangeLabel = `${colName(sel.c1)}${sel.r1}:${colName(sel.c2)}${sel.r2}`;

  const move = (dc: number, dr: number) => {
    const m = /^([A-Z]+)(\d+)$/.exec(active)!;
    const c = Math.min(COLS - 1, Math.max(0, colIndex(m[1]!) + dc));
    const r = Math.min(ROWS, Math.max(1, Number(m[2]) + dr));
    setActive(`${colName(c)}${r}`);
    setAnchor(`${colName(c)}${r}`);
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
            <ToolButton onClick={() => setCell(active, "=COUNT(A1:A10)")} label="=COUNT" />
            <ToolButton onClick={() => setCell(active, '=IF(A1>0,"Evet","Hayır")')} label="=IF" />
          </RibbonGroup>
          <RibbonGroup label="Grafik">
            <ToolButton onClick={() => setChart({ kind: "bar", rect: sel })} label="Çubuk" />
            <ToolButton onClick={() => setChart({ kind: "line", rect: sel })} label="Çizgi" />
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
          {sel.c1 === sel.c2 && sel.r1 === sel.r2 ? active : rangeLabel}
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
                  const inSel = inRect(sel, c, r + 1);
                  const fr = fillTo ? rectOf(anchor, fillTo) : null;
                  const inFill = !!fr && inRect({ ...fr, c1: Math.min(fr.c1, sel.c1), r1: Math.min(fr.r1, sel.r1), c2: Math.max(fr.c2, sel.c2), r2: Math.max(fr.r2, sel.r2) }, c, r + 1) && !inSel;
                  const isCorner = c === sel.c2 && r + 1 === sel.r2;
                  return (
                    <td
                      key={c}
                      style={{
                        border: "1px solid var(--border)",
                        outline: inFill ? "1px dashed var(--tb-accent)" : undefined,
                      }}
                      className="relative p-0"
                      onPointerEnter={() => {
                        if (fillTo) setFillTo(ref);
                        else if (selecting) setActive(ref);
                      }}
                    >
                      {isCorner ? (
                        <span
                          aria-label="Doldurma tutamacı"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFillTo(ref);
                          }}
                          className="absolute -bottom-1 -right-1 z-[5] h-2 w-2 cursor-crosshair bg-[var(--tb-accent)]"
                        />
                      ) : null}
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          if (e.shiftKey) setActive(ref);
                          else {
                            setAnchor(ref);
                            setActive(ref);
                          }
                          setSelecting(true);
                        }}
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
                          on || inSel
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

      {chart ? (
        <SheetChart
          kind={chart.kind}
          rect={chart.rect}
          value={(c, r) => {
            const raw = cells[`${colName(c)}${r}`] ?? "";
            return raw.startsWith("=") ? evaluate(raw, cells) : raw;
          }}
          onClose={() => setChart(null)}
        />
      ) : null}

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
