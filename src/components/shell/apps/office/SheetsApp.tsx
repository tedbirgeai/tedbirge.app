/**
 * TEDBIRGE SHEETS — hesap tablosu
 * ------------------------------------------------------------------
 * Harfli sütun / numaralı satır başlıklı gerçek hücre ızgarası, hücre
 * içi düzenleyici, formül çubuğu, biçimler ve çok sayfalı yapı.
 * Hesaplama tamamen cihazda yapılır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Download, Plus, Upload, X } from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";
import { colIndex, colName, evaluate, fillSeries, parseRef } from "./formula";
import { SheetChart, type ChartKind } from "./SheetChart";
import { alignOf, formatValue, type CellFormat, type NumFormat } from "./sheet-format";
import { parseCsv, parseXlsx, toCsv, toXlsx } from "./sheet-io";

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
const DEFAULT_W = 96;

export type Sheet = {
  name: string;
  cells: Record<string, string>;
  formats?: Record<string, CellFormat>;
  widths?: Record<number, number>;
};
export type Book = { v: 2; sheets: Sheet[] };

/** Eski CSV belgelerini çok sayfalı yapıya yükseltir. */
export function parseBook(text: string): Book {
  if (text.trim().startsWith("{")) {
    try {
      const data = JSON.parse(text) as Book;
      if (Array.isArray(data.sheets) && data.sheets.length) {
        return {
          v: 2,
          sheets: data.sheets.map((s) => ({
            name: s.name,
            cells: s.cells ?? {},
            formats: s.formats ?? {},
            widths: s.widths ?? {},
          })),
        };
      }
    } catch {
      /* bozuk belge: boş kitap */
    }
  }
  return { v: 2, sheets: [{ name: "Sheet1", cells: parseCsv(text), formats: {}, widths: {} }] };
}

function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SheetsApp() {
  const editor = useOfficeEditor("sheets");
  const book = useMemo(() => parseBook(editor.text), [editor.text]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [active, setActive] = useState("A1");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState("A1");
  const [selecting, setSelecting] = useState(false);
  const [fillTo, setFillTo] = useState<string | null>(null);
  const [chart, setChart] = useState<{ kind: ChartKind; rect: Rect } | null>(null);
  const [resize, setResize] = useState<{ col: number; x: number; w: number } | null>(null);
  const sel = rectOf(anchor, active);

  const sheet = book.sheets[Math.min(sheetIndex, book.sheets.length - 1)]!;
  const cells = sheet.cells;
  const formats = sheet.formats ?? {};
  const widths = sheet.widths ?? {};
  const [liveWidth, setLiveWidth] = useState<Record<number, number>>({});
  const widthOf = (c: number) => liveWidth[c] ?? widths[c] ?? DEFAULT_W;

  useEffect(() => {
    if (!editing) setDraft(cells[active] ?? "");
  }, [active, cells, editing]);

  useEffect(() => {
    if (editing) cellInputRef.current?.focus();
  }, [editing]);

  const writeBook = useCallback((next: Book) => editor.setText(JSON.stringify(next)), [editor]);

  const patchSheet = useCallback(
    (fn: (s: Sheet) => Sheet) =>
      writeBook({ v: 2, sheets: book.sheets.map((s, i) => (i === sheetIndex ? fn(s) : s)) }),
    [book, sheetIndex, writeBook],
  );

  const setMany = useCallback(
    (patch: Record<string, string>) => patchSheet((s) => ({ ...s, cells: { ...s.cells, ...patch } })),
    [patchSheet],
  );
  const setCell = useCallback((ref: string, value: string) => setMany({ [ref]: value }), [setMany]);

  const eachSel = (fn: (ref: string) => void) => {
    for (let c = sel.c1; c <= sel.c2; c++) for (let r = sel.r1; r <= sel.r2; r++) fn(`${colName(c)}${r}`);
  };

  const setFormat = (patch: CellFormat) =>
    patchSheet((s) => {
      const f = { ...(s.formats ?? {}) };
      eachSel((ref) => (f[ref] = { ...f[ref], ...patch }));
      return { ...s, formats: f };
    });

  const clearSel = () => {
    const patch: Record<string, string> = {};
    eachSel((ref) => (patch[ref] = ""));
    setMany(patch);
  };

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

  /* Sütun genişliği sürükleme */
  useEffect(() => {
    if (!resize) return;
    const mv = (e: PointerEvent) =>
      setLiveWidth({ [resize.col]: Math.max(48, resize.w + e.clientX - resize.x) });
    const up = (e: PointerEvent) => {
      const w = Math.max(48, resize.w + e.clientX - resize.x);
      patchSheet((s) => ({ ...s, widths: { ...(s.widths ?? {}), [resize.col]: w } }));
      setLiveWidth({});
      setResize(null);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
    };
  }, [resize, patchSheet]);

  const rangeLabel = `${colName(sel.c1)}${sel.r1}:${colName(sel.c2)}${sel.r2}`;

  const move = (dc: number, dr: number) => {
    const m = /^([A-Z]+)(\d+)$/.exec(active)!;
    const c = Math.min(COLS - 1, Math.max(0, colIndex(m[1]!) + dc));
    const r = Math.min(ROWS, Math.max(1, Number(m[2]) + dr));
    setActive(`${colName(c)}${r}`);
    setAnchor(`${colName(c)}${r}`);
  };

  const startEdit = (initial?: string) => {
    setDraft(initial ?? cells[active] ?? "");
    setEditing(true);
  };
  const commit = (dc: number, dr: number) => {
    if (draft !== (cells[active] ?? "")) setCell(active, draft);
    setEditing(false);
    move(dc, dr);
    requestAnimationFrame(() => gridRef.current?.focus());
  };
  const cancel = () => {
    setEditing(false);
    setDraft(cells[active] ?? "");
    requestAnimationFrame(() => gridRef.current?.focus());
  };

  /** Düzenleyici tuşları (hücre içi ve formül çubuğu ortak). */
  const editorKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit(0, e.shiftKey ? -1 : 1);
    else if (e.key === "Tab") commit(e.shiftKey ? -1 : 1, 0);
    else if (e.key === "Escape") cancel();
    else return;
    e.preventDefault();
  };

  const gridKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editing) return;
    const k = e.key;
    if (k === "ArrowRight") move(1, 0);
    else if (k === "ArrowLeft") move(-1, 0);
    else if (k === "ArrowDown") move(0, 1);
    else if (k === "ArrowUp") move(0, -1);
    else if (k === "Enter") move(0, e.shiftKey ? -1 : 1);
    else if (k === "Tab") move(e.shiftKey ? -1 : 1, 0);
    else if (k === "F2") startEdit();
    else if (k === "Delete" || k === "Backspace") clearSel();
    else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) startEdit(k);
    else return;
    e.preventDefault();
  };

  const shownOf = (ref: string) => {
    const raw = cells[ref] ?? "";
    return raw.startsWith("=") ? evaluate(raw, cells) : raw;
  };

  const importFile = async (file: File) => {
    const imported = file.name.toLowerCase().endsWith(".xlsx")
      ? await parseXlsx(new Uint8Array(await file.arrayBuffer()))
      : parseCsv(await file.text());
    const name = file.name.replace(/\.[^.]+$/, "").slice(0, 31) || `Sheet${book.sheets.length + 1}`;
    writeBook({ v: 2, sheets: [...book.sheets, { name, cells: imported, formats: {}, widths: {} }] });
    setSheetIndex(book.sheets.length);
  };

  const activeFmt = formats[active] ?? {};
  const numBtn = (num: NumFormat, label: string) => (
    <ToolButton onClick={() => setFormat({ num })} label={label} active={(activeFmt.num ?? "general") === num} />
  );

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
          <RibbonGroup label="Sayı">
            {numBtn("general", "Genel")}
            {numBtn("number", "0,00")}
            {numBtn("try", "₺")}
            {numBtn("usd", "$")}
            {numBtn("eur", "€")}
            {numBtn("percent", "%")}
          </RibbonGroup>
          <RibbonGroup label="Hizalama">
            <ToolButton onClick={() => setFormat({ align: "left" })} label="Sola" active={activeFmt.align === "left"} icon={<AlignLeft className="h-4 w-4" />} />
            <ToolButton onClick={() => setFormat({ align: "center" })} label="Ortala" active={activeFmt.align === "center"} icon={<AlignCenter className="h-4 w-4" />} />
            <ToolButton onClick={() => setFormat({ align: "right" })} label="Sağa" active={activeFmt.align === "right"} icon={<AlignRight className="h-4 w-4" />} />
          </RibbonGroup>
          <RibbonGroup label="Hücre">
            <ToolButton onClick={clearSel} label="Temizle" />
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
    {
      id: "veri",
      label: "Veri",
      content: (
        <>
          <RibbonGroup label="İçe aktar">
            <ToolButton onClick={() => fileRef.current?.click()} icon={<Upload className="h-4 w-4" />} label="CSV / XLSX yükle" />
          </RibbonGroup>
          <RibbonGroup label="Dışa aktar">
            <ToolButton
              onClick={() => download(`${sheet.name}.csv`, "\uFEFF" + toCsv(cells, shownOf), "text/csv;charset=utf-8")}
              icon={<Download className="h-4 w-4" />}
              label="CSV"
            />
            <ToolButton
              onClick={() =>
                download(
                  `${sheet.name}.xlsx`,
                  toXlsx(cells, sheet.name) as BlobPart,
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
              }
              icon={<Download className="h-4 w-4" />}
              label="XLSX"
            />
          </RibbonGroup>
        </>
      ),
    },
  ];

  return (
    <OfficeShell kind="sheets" editor={editor} tabs={tabs} status={<span>{sheet.name}</span>} sidebar={false}>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importFile(f);
          e.target.value = "";
        }}
      />
      {/* Formül çubuğu */}
      <div className="flex items-center gap-2 border-b px-2 py-1.5" style={{ borderColor: "var(--border)" }}>
        <span
          className="w-16 rounded-md px-2 py-1 text-center font-osmono text-[12px] text-[var(--tb-text)]"
          style={{ border: "1px solid var(--border)" }}
        >
          {sel.c1 === sel.c2 && sel.r1 === sel.r2 ? active : rangeLabel}
        </span>
        <span className="font-osmono text-[13px] text-[var(--tb-muted)]">fx</span>
        <input
          value={draft}
          onFocus={() => setEditing(false)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={editorKeys}
          onBlur={() => {
            if (!editing && draft !== (cells[active] ?? "")) setCell(active, draft);
          }}
          aria-label="Formül çubuğu"
          placeholder="Değer veya =SUM(A1:A10)"
          className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 text-[13px] text-[var(--tb-text)] outline-none"
          style={{ border: "1px solid var(--border)" }}
        />
      </div>

      {/* Hücre ızgarası */}
      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label="Hesap tablosu"
        onKeyDown={gridKeys}
        className="min-h-0 flex-1 overflow-auto outline-none"
      >
        <table className="border-collapse text-[12px]" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {Array.from({ length: COLS }).map((_, c) => (
              <col key={c} style={{ width: widthOf(c) }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-10 bg-[var(--tb-panel-solid)]" style={{ border: "1px solid var(--border)" }} />
              {Array.from({ length: COLS }).map((_, c) => (
                <th
                  key={c}
                  className="relative select-none bg-[var(--tb-panel-solid)] px-2 py-1 font-osmono text-[11px] font-normal text-[var(--tb-muted)]"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {colName(c)}
                  <span
                    aria-label={`${colName(c)} sütun genişliği`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setResize({ col: c, x: e.clientX, w: widthOf(c) });
                    }}
                    className="absolute top-0 -right-1 z-[2] h-full w-2 cursor-col-resize hover:bg-[var(--tb-accent)]"
                  />
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
                  const value = shownOf(ref);
                  const fmt = formats[ref];
                  const on = ref === active;
                  const inSel = inRect(sel, c, r + 1);
                  const fr = fillTo ? rectOf(anchor, fillTo) : null;
                  const inFill =
                    !!fr &&
                    inRect(
                      { c1: Math.min(fr.c1, sel.c1), r1: Math.min(fr.r1, sel.r1), c2: Math.max(fr.c2, sel.c2), r2: Math.max(fr.r2, sel.r2) },
                      c,
                      r + 1,
                    ) &&
                    !inSel;
                  const isCorner = c === sel.c2 && r + 1 === sel.r2;
                  return (
                    <td
                      key={c}
                      role="gridcell"
                      aria-label={`Hücre ${ref}`}
                      aria-selected={on}
                      style={{
                        border: "1px solid var(--border)",
                        outline: on ? "2px solid var(--tb-accent)" : inFill ? "1px dashed var(--tb-accent)" : undefined,
                        outlineOffset: -1,
                      }}
                      className={`relative h-7 p-0 ${
                        inSel && !on ? "bg-[color-mix(in_srgb,var(--tb-accent)_16%,transparent)]" : ""
                      }`}
                      onPointerDown={(e) => {
                        if (editing && on) return;
                        if (editing) commit(0, 0);
                        if (e.shiftKey) setActive(ref);
                        else {
                          setAnchor(ref);
                          setActive(ref);
                        }
                        setSelecting(true);
                        requestAnimationFrame(() => gridRef.current?.focus());
                      }}
                      onDoubleClick={() => startEdit()}
                      onPointerEnter={() => {
                        if (fillTo) setFillTo(ref);
                        else if (selecting) setActive(ref);
                      }}
                    >
                      {on && editing ? (
                        <input
                          ref={cellInputRef}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={editorKeys}
                          onBlur={() => editing && commit(0, 0)}
                          aria-label={`${ref} düzenle`}
                          className="absolute inset-0 z-[6] h-full w-full bg-[var(--tb-panel-solid)] px-2 text-[12px] text-[var(--tb-text)] outline-none"
                        />
                      ) : (
                        <div
                          className="truncate px-2 leading-7 text-[var(--tb-text)]"
                          style={{ textAlign: alignOf(value, fmt) }}
                        >
                          {formatValue(value, fmt)}
                        </div>
                      )}
                      {isCorner && !editing ? (
                        <span
                          aria-label="Doldurma tutamacı"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setFillTo(ref);
                          }}
                          className="absolute -right-1 -bottom-1 z-[5] h-2 w-2 cursor-crosshair bg-[var(--tb-accent)]"
                        />
                      ) : null}
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
          value={(c, r) => shownOf(`${colName(c)}${r}`)}
          onClose={() => setChart(null)}
        />
      ) : null}

      {/* Sayfa sekmeleri */}
      <div className="flex items-center gap-1 border-t px-2 py-1" style={{ borderColor: "var(--border)" }}>
        {book.sheets.map((s, i) => (
          <span key={s.name + i} className="flex items-center">
            <button
              type="button"
              onClick={() => setSheetIndex(i)}
              onDoubleClick={() => {
                const name = window.prompt("Sayfa adı", s.name);
                if (!name) return;
                writeBook({ v: 2, sheets: book.sheets.map((x, j) => (j === i ? { ...x, name } : x)) });
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
            writeBook({ v: 2, sheets: [...book.sheets, { name: `Sheet${book.sheets.length + 1}`, cells: {} }] })
          }
          className="ml-1 rounded-md px-2 py-1 text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </OfficeShell>
  );
}
