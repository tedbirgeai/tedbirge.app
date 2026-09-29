/**
 * TEDBIRGE WRITER — görsel kelime işlemci
 * ------------------------------------------------------------------
 * Gerçek A4 sayfa düzeni, kenar boşlukları, cetvel ve sekmeli şerit
 * menü. Markdown önizleme bölünmesi yoktur; yazılan şey görünen şeydir.
 * Belge HTML olarak şifreli VFS katmanına yazılır.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  Redo2,
  Ruler as RulerIcon,
  Table,
  Search,
  Underline,
  Undo2,
  X,
} from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";
import { buildWordDoc, downloadBlob, printAsPdf } from "./doc-export";
import { findInDom, replaceAllInDom, replaceMatch, selectMatch } from "./find-replace";

const FONTS = ["Inter", "Georgia", "Times New Roman", "Courier New", "Arial"];
const SIZES = [10, 11, 12, 14, 16, 18, 24, 32];

/** Eski düz metin/markdown belgelerini HTML gövdeye çevirir. */
function toHtml(text: string): string {
  const t = text.trim();
  if (!t) return "<p><br/></p>";
  if (t.startsWith("<")) return text;
  return t
    .split(/\n{2,}/)
    .map((block) => {
      const line = block.trim();
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      return `<p>${line.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("");
}

export function WriterApp() {
  const editor = useOfficeEditor("writer");
  const pageRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [ruler, setRuler] = useState(true);
  const [stats, setStats] = useState({ words: 0, chars: 0, pages: 1 });
  const loadedFor = useRef<string | null>(null);
  const [fmt, setFmt] = useState<Record<string, boolean>>({});

  // Araç çubuğu aktif durumu: imleç konumundaki biçim okunur.
  useEffect(() => {
    const read = () => {
      const el = pageRef.current;
      const sel = document.getSelection();
      if (!el || !sel?.anchorNode || !el.contains(sel.anchorNode)) return;
      const next: Record<string, boolean> = {};
      for (const k of ["bold", "italic", "underline", "justifyLeft", "justifyCenter", "justifyRight", "justifyFull", "insertUnorderedList", "insertOrderedList"])
        next[k] = document.queryCommandState(k);
      const block = String(document.queryCommandValue("formatBlock")).toUpperCase();
      next[block === "" ? "P" : block] = true;
      setFmt(next);
    };
    document.addEventListener("selectionchange", read);
    return () => document.removeEventListener("selectionchange", read);
  }, []);

  const title = (editor.title || "belge").replace(/[\\/:*?"<>|]/g, "_");
  const exportPdf = () => printAsPdf(pageRef.current?.innerHTML ?? "", title);
  const exportWord = () => downloadBlob(buildWordDoc(pageRef.current?.innerHTML ?? "", title), `${title}.doc`);

  /* Belge değiştiğinde gövde bir kez basılır (yazarken imleç kaçmaz). */
  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const key = `${editor.id ?? "yeni"}`;
    if (loadedFor.current === key) return;
    loadedFor.current = key;
    el.innerHTML = toHtml(editor.text);
    measure();
  }, [editor.id, editor.text]);

  const measure = useCallback(() => {
    const el = pageRef.current;
    if (!el) return;
    const plain = el.innerText.replace(/\s+/g, " ").trim();
    setStats({
      words: plain ? plain.split(" ").length : 0,
      chars: el.innerText.length,
      pages: Math.max(1, Math.ceil(el.scrollHeight / 1123)),
    });
  }, []);

  const push = useCallback(() => {
    const el = pageRef.current;
    if (!el) return;
    editor.setText(el.innerHTML);
    measure();
  }, [editor, measure]);

  const cmd = useCallback(
    (name: string, value?: string) => {
      pageRef.current?.focus();
      document.execCommand(name, false, value);
      push();
    },
    [push],
  );

  const insertTable = () => {
    const rows = Number(window.prompt("Satır sayısı", "3") ?? 0);
    const cols = Number(window.prompt("Sütun sayısı", "3") ?? 0);
    if (!rows || !cols) return;
    const body = Array.from({ length: rows })
      .map(
        () =>
          `<tr>${Array.from({ length: cols })
            .map(() => '<td style="border:1px solid #999;padding:6px">&nbsp;</td>')
            .join("")}</tr>`,
      )
      .join("");
    cmd("insertHTML", `<table style="border-collapse:collapse;width:100%">${body}</table><p></p>`);
  };

  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => cmd("insertHTML", `<img src="${String(reader.result)}" width="420"/>`);
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const [find, setFind] = useState({ open: false, q: "", r: "", cs: false, pos: 0 });
  const [matchCount, setMatchCount] = useState(0);
  useEffect(() => {
    const el = pageRef.current;
    setMatchCount(el && find.open ? findInDom(el, find.q, find.cs).length : 0);
  }, [find, editor.text]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k !== "f" && k !== "h") return;
      const host = pageRef.current?.closest(".tbos-window") ?? pageRef.current?.parentElement;
      if (!host || !(host.contains(document.activeElement) || document.activeElement === document.body)) return;
      e.preventDefault();
      const s = document.getSelection()?.toString() ?? "";
      setFind((f) => ({ ...f, open: true, q: s && s.length < 80 ? s : f.q }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const step = (dir: number) => {
    const el = pageRef.current;
    if (!el) return;
    const ms = findInDom(el, find.q, find.cs);
    if (!ms.length) return;
    const pos = (find.pos + dir + ms.length) % ms.length;
    selectMatch(ms[pos]!);
    setFind((f) => ({ ...f, pos }));
  };
  const replaceOne = () => {
    const el = pageRef.current;
    if (!el) return;
    const ms = findInDom(el, find.q, find.cs);
    const m = ms[Math.min(find.pos, ms.length - 1)];
    if (!m) return;
    replaceMatch(m, find.r);
    push();
    const next = findInDom(el, find.q, find.cs);
    if (next.length) selectMatch(next[Math.min(find.pos, next.length - 1)]!);
  };
  const replaceAll = () => {
    const el = pageRef.current;
    if (!el) return;
    replaceAllInDom(el, find.q, find.r, find.cs);
    push();
    setFind((f) => ({ ...f, pos: 0 }));
  };

  const tabs = [
    {
      id: "giris",
      label: "Giriş",
      content: (
        <>
          <RibbonGroup label="Yazı tipi">
            <select
              aria-label="Yazı tipi"
              onChange={(e) => cmd("fontName", e.target.value)}
              className="rounded-md bg-transparent px-2 py-1 text-[12px] text-[var(--tb-text)]"
              style={{ border: "1px solid var(--border)" }}
            >
              {FONTS.map((f) => (
                <option key={f} value={f} className="text-black">
                  {f}
                </option>
              ))}
            </select>
            <select
              aria-label="Punto"
              defaultValue="12"
              onChange={(e) => {
                cmd("fontSize", "7");
                const el = pageRef.current;
                el?.querySelectorAll("font[size='7']").forEach((n) => {
                  n.removeAttribute("size");
                  (n as HTMLElement).style.fontSize = `${e.target.value}pt`;
                });
                push();
              }}
              className="rounded-md bg-transparent px-2 py-1 text-[12px] text-[var(--tb-text)]"
              style={{ border: "1px solid var(--border)" }}
            >
              {SIZES.map((s) => (
                <option key={s} value={s} className="text-black">
                  {s}
                </option>
              ))}
            </select>
          </RibbonGroup>

          <RibbonGroup label="Biçim">
            <ToolButton
              onClick={() => cmd("bold")}
              active={!!fmt.bold}
              icon={<Bold className="h-4 w-4" />}
              title="Kalın"
            />
            <ToolButton
              onClick={() => cmd("italic")}
              active={!!fmt.italic}
              icon={<Italic className="h-4 w-4" />}
              title="İtalik"
            />
            <ToolButton
              onClick={() => cmd("underline")}
              active={!!fmt.underline}
              icon={<Underline className="h-4 w-4" />}
              title="Altı çizili"
            />
          </RibbonGroup>

          <RibbonGroup label="Renk">
            <label className="flex items-center gap-1 text-[11px] text-[var(--tb-muted)]">
              A
              <input
                type="color"
                aria-label="Metin rengi"
                defaultValue="#111827"
                onChange={(e) => cmd("foreColor", e.target.value)}
                className="h-6 w-7 cursor-pointer rounded bg-transparent"
              />
            </label>
            <label className="flex items-center gap-1 text-[11px] text-[var(--tb-muted)]">
              Vurgu
              <input
                type="color"
                aria-label="Vurgu rengi"
                defaultValue="#fde047"
                onChange={(e) => cmd("hiliteColor", e.target.value)}
                className="h-6 w-7 cursor-pointer rounded bg-transparent"
              />
            </label>
          </RibbonGroup>

          <RibbonGroup label="Düzenleme">
            <ToolButton onClick={() => setFind((f) => ({ ...f, open: true }))} icon={<Search className="h-4 w-4" />} label="Bul/Değiştir" />
          </RibbonGroup>


          <RibbonGroup label="Paragraf">
            <ToolButton
              onClick={() => cmd("justifyLeft")}
              active={!!fmt.justifyLeft}
              icon={<AlignLeft className="h-4 w-4" />}
              title="Sola hizala"
            />
            <ToolButton
              onClick={() => cmd("justifyCenter")}
              active={!!fmt.justifyCenter}
              icon={<AlignCenter className="h-4 w-4" />}
              title="Ortala"
            />
            <ToolButton
              onClick={() => cmd("justifyRight")}
              active={!!fmt.justifyRight}
              icon={<AlignRight className="h-4 w-4" />}
              title="Sağa hizala"
            />
            <ToolButton
              onClick={() => cmd("justifyFull")}
              active={!!fmt.justifyFull}
              icon={<AlignJustify className="h-4 w-4" />}
              title="İki yana yasla"
            />
            <ToolButton
              onClick={() => cmd("insertUnorderedList")}
              active={!!fmt.insertUnorderedList}
              icon={<List className="h-4 w-4" />}
              title="Madde listesi"
            />
            <ToolButton
              onClick={() => cmd("insertOrderedList")}
              active={!!fmt.insertOrderedList}
              icon={<ListOrdered className="h-4 w-4" />}
              title="Numaralı liste"
            />
          </RibbonGroup>

          <RibbonGroup label="Stiller">
            {(["H1", "H2", "H3", "P"] as const).map((s) => (
              <ToolButton
                key={s}
                onClick={() => cmd("formatBlock", s === "P" ? "P" : s)}
                active={!!fmt[s]}
                label={s === "P" ? "Metin" : `Başlık ${s[1]}`}
              />
            ))}
          </RibbonGroup>
        </>
      ),
    },
    {
      id: "ekle",
      label: "Ekle",
      content: (
        <>
          <ToolButton onClick={insertTable} icon={<Table className="h-4 w-4" />} label="Tablo" />
          <ToolButton
            onClick={insertImage}
            icon={<ImageIcon className="h-4 w-4" />}
            label="Görsel"
          />
          <ToolButton
            onClick={() => cmd("insertHorizontalRule")}
            icon={<Minus className="h-4 w-4" />}
            label="Çizgi"
          />
          <ToolButton
            onClick={() => cmd("insertHTML", '<div style="break-after:page;height:0"></div>')}
            label="Sayfa Sonu"
          />
        </>
      ),
    },
    {
      id: "duzen",
      label: "Düzen",
      content: (
        <>
          <ToolButton
            onClick={() => cmd("undo")}
            icon={<Undo2 className="h-4 w-4" />}
            label="Geri"
          />
          <ToolButton
            onClick={() => cmd("redo")}
            icon={<Redo2 className="h-4 w-4" />}
            label="İleri"
          />
          <ToolButton onClick={() => cmd("removeFormat")} label="Biçimi Temizle" />
        </>
      ),
    },
    {
      id: "disa",
      label: "Dışa aktar",
      content: (
        <>
          <ToolButton onClick={exportPdf} label="PDF (A4)" />
          <ToolButton onClick={exportWord} label="Word (.doc)" />
        </>
      ),
    },
    {
      id: "gorunum",
      label: "Görünüm",
      content: (
        <>
          <ToolButton onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))} label="Uzaklaş" />
          <span className="px-1 font-osmono text-[11px] text-[var(--tb-muted)]">
            %{Math.round(zoom * 100)}
          </span>
          <ToolButton onClick={() => setZoom((z) => Math.min(2, z + 0.1))} label="Yakınlaş" />
          <ToolButton
            onClick={() => setRuler((r) => !r)}
            icon={<RulerIcon className="h-4 w-4" />}
            label="Cetvel"
            active={ruler}
          />
        </>
      ),
    },
  ];

  return (
    <OfficeShell
      kind="writer"
      editor={editor}
      tabs={tabs}
      status={
        <span>
          {stats.words} kelime · {stats.chars} karakter · {stats.pages} sayfa
        </span>
      }
    >
      {find.open ? (
        <div
          className="flex flex-wrap items-center gap-2 border-b px-3 py-1.5 text-[12px]"
          style={{ borderColor: "var(--border)" }}
          role="search"
        >
          <input
            autoFocus
            value={find.q}
            onChange={(e) => setFind((f) => ({ ...f, q: e.target.value, pos: 0 }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") step(e.shiftKey ? -1 : 1);
              if (e.key === "Escape") setFind((f) => ({ ...f, open: false }));
            }}
            placeholder="Bul"
            aria-label="Bul"
            className="w-40 rounded-md bg-transparent px-2 py-1 text-[var(--tb-text)] outline-none"
            style={{ border: "1px solid var(--border)" }}
          />
          <input
            value={find.r}
            onChange={(e) => setFind((f) => ({ ...f, r: e.target.value }))}
            placeholder="Değiştir"
            aria-label="Değiştir"
            className="w-40 rounded-md bg-transparent px-2 py-1 text-[var(--tb-text)] outline-none"
            style={{ border: "1px solid var(--border)" }}
          />
          <span className="font-osmono text-[11px] text-[var(--tb-muted)]">
            {matchCount ? `${Math.min(find.pos + 1, matchCount)}/${matchCount}` : "0 eşleşme"}
          </span>
          <ToolButton onClick={() => step(-1)} label="Önceki" />
          <ToolButton onClick={() => step(1)} label="Sonraki" />
          <ToolButton onClick={replaceOne} label="Değiştir" />
          <ToolButton onClick={replaceAll} label="Tümünü değiştir" />
          <label className="flex items-center gap-1 text-[var(--tb-muted)]">
            <input
              type="checkbox"
              checked={find.cs}
              onChange={(e) => setFind((f) => ({ ...f, cs: e.target.checked }))}
            />
            Aa
          </label>
          <button
            type="button"
            aria-label="Bul panelini kapat"
            onClick={() => setFind((f) => ({ ...f, open: false }))}
            className="ml-auto text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto" style={{ width: 794 * zoom }}>
          {ruler ? (
            <div
              className="mb-2 flex h-5 items-end overflow-hidden rounded-sm"
              style={{ border: "1px solid var(--border)", width: 794 * zoom }}
              aria-hidden
            >
              <span className="h-full shrink-0 bg-[color-mix(in_srgb,var(--tb-text)_10%,transparent)]" style={{ width: `${(76 / 794) * 100}%` }} />
              {Array.from({ length: 17 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 border-r text-[8px] text-[var(--tb-muted)]"
                  style={{ borderColor: "var(--border)" }}
                >
                  {i + 1}
                </span>
              ))}
              <span className="h-full shrink-0 bg-[color-mix(in_srgb,var(--tb-text)_10%,transparent)]" style={{ width: `${(76 / 794) * 100}%` }} />
            </div>
          ) : null}

          <div
            style={{
              width: 794,
              minHeight: 1123,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              background: "#ffffff",
              boxShadow: "0 18px 60px -20px rgba(0,0,0,0.6)",
            }}
            className="relative rounded-sm"
          >
            <div
              ref={pageRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Belge sayfası"
              onInput={push}
              onBlur={push}
              spellCheck={false}
              className="tb-doc h-full w-full outline-none"
              style={{
                padding: "96px 76px",
                color: "#111827",
                fontFamily: "Georgia, serif",
                fontSize: "12pt",
                lineHeight: 1.6,
                minHeight: 1123,
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-[96px_76px] rounded-sm"
              style={{ outline: "1px dashed rgba(17,24,39,0.15)" }}
            />
          </div>
        </div>
      </div>
    </OfficeShell>
  );
}
