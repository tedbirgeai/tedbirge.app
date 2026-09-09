/**
 * TEDBIRGE NOTES — blok tabanlı not çalışma alanı
 * ------------------------------------------------------------------
 * Her satır bir bloktur: başlık, metin, madde, yapılacak, alıntı, kod
 * veya ayraç. "/" komut menüsü blok türünü değiştirir, bloklar yukarı
 * aşağı taşınabilir. Notlar şifreli VFS katmanında saklanır.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pin, Plus, Search, Trash2 } from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";

type BlockType = "h1" | "h2" | "text" | "bullet" | "todo" | "quote" | "code" | "divider";
type Block = { id: string; type: BlockType; text: string; done?: boolean };
type Note = { v: 2; pinned: boolean; tags: string[]; blocks: Block[] };

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const TYPE_LABEL: Record<BlockType, string> = {
  h1: "Başlık 1",
  h2: "Başlık 2",
  text: "Metin",
  bullet: "Madde",
  todo: "Yapılacak",
  quote: "Alıntı",
  code: "Kod",
  divider: "Ayraç",
};

function parseNote(text: string): Note {
  if (text.trim().startsWith("{")) {
    try {
      const data = JSON.parse(text) as Note;
      if (Array.isArray(data.blocks))
        return {
          v: 2,
          pinned: Boolean(data.pinned),
          tags: data.tags ?? [],
          blocks: data.blocks.length ? data.blocks : [{ id: uid(), type: "text", text: "" }],
        };
    } catch {
      /* bozuk belge: boş not */
    }
  }
  const blocks = (text ? text.split("\n") : [""]).map((line) => ({
    id: uid(),
    type: "text" as BlockType,
    text: line,
  }));
  return { v: 2, pinned: false, tags: [], blocks };
}

export function NotesApp() {
  const editor = useOfficeEditor("notes");
  const note = useMemo(() => parseNote(editor.text), [editor.text]);
  const [query, setQuery] = useState("");
  const [slash, setSlash] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const write = useCallback((next: Note) => editor.setText(JSON.stringify(next)), [editor]);
  const setBlocks = useCallback((blocks: Block[]) => write({ ...note, blocks }), [note, write]);

  const patch = (id: string, p: Partial<Block>) =>
    setBlocks(note.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));

  const addAfter = (id: string | null, type: BlockType = "text") => {
    const nb: Block = { id: uid(), type, text: "" };
    if (!id) return setBlocks([...note.blocks, nb]);
    const i = note.blocks.findIndex((b) => b.id === id);
    setBlocks([...note.blocks.slice(0, i + 1), nb, ...note.blocks.slice(i + 1)]);
    window.setTimeout(() => inputs.current[nb.id]?.focus(), 30);
  };

  const swap = (id: string, dir: -1 | 1) => {
    const i = note.blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= note.blocks.length) return;
    const next = [...note.blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setBlocks(next);
  };

  const visible = query
    ? note.blocks.filter((b) => b.text.toLowerCase().includes(query.toLowerCase()))
    : note.blocks;

  const tabs = [
    {
      id: "giris",
      label: "Giriş",
      content: (
        <>
          <RibbonGroup label="Blok">
            {(["h1", "h2", "text", "bullet", "todo", "quote", "code", "divider"] as BlockType[]).map(
              (t) => (
                <ToolButton key={t} onClick={() => addAfter(null, t)} label={TYPE_LABEL[t]} />
              ),
            )}
          </RibbonGroup>
          <RibbonGroup label="Not">
            <ToolButton
              onClick={() => write({ ...note, pinned: !note.pinned })}
              icon={<Pin className="h-4 w-4" />}
              label={note.pinned ? "Sabit" : "Sabitle"}
              active={note.pinned}
            />
            <ToolButton
              onClick={() => {
                const t = window.prompt("Etiket ekle");
                if (t) write({ ...note, tags: [...new Set([...note.tags, t])] });
              }}
              label="Etiket"
            />
          </RibbonGroup>
        </>
      ),
    },
  ];

  return (
    <OfficeShell
      kind="notes"
      editor={editor}
      tabs={tabs}
      status={<span>{note.blocks.length} blok</span>}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-1.5"
        style={{ borderColor: "var(--border)" }}
      >
        <Search className="h-4 w-4 text-[var(--tb-muted)]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Notta ara"
          aria-label="Notta ara"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--tb-text)] outline-none"
        />
        {note.tags.map((t) => (
          <span
            key={t}
            className="rounded-full px-2 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]"
            style={{ border: "1px solid var(--border)" }}
          >
            #{t}
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {visible.map((b) => (
          <div key={b.id} className="group relative flex items-start gap-2 py-0.5">
            <div className="flex w-10 shrink-0 justify-end pt-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                type="button"
                aria-label="Yukarı taşı"
                onClick={() => swap(b.id, -1)}
                className="text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Aşağı taşı"
                onClick={() => swap(b.id, 1)}
                className="text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {b.type === "todo" ? (
              <input
                type="checkbox"
                checked={Boolean(b.done)}
                onChange={(e) => patch(b.id, { done: e.target.checked })}
                aria-label="Tamamlandı"
                className="mt-2 h-4 w-4 accent-[var(--tb-accent)]"
              />
            ) : b.type === "bullet" ? (
              <span className="mt-2 text-[var(--tb-muted)]">•</span>
            ) : null}

            {b.type === "divider" ? (
              <hr className="my-3 w-full" style={{ borderColor: "var(--border)" }} />
            ) : (
              <textarea
                ref={(el) => {
                  inputs.current[b.id] = el;
                }}
                value={b.text}
                rows={1}
                onChange={(e) => {
                  patch(b.id, { text: e.target.value });
                  setSlash(e.target.value.endsWith("/") ? b.id : null);
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    addAfter(b.id);
                  }
                  if (e.key === "Backspace" && !b.text && note.blocks.length > 1) {
                    e.preventDefault();
                    setBlocks(note.blocks.filter((x) => x.id !== b.id));
                  }
                }}
                placeholder={b.type === "text" ? "Yazın veya / ile blok ekleyin" : TYPE_LABEL[b.type]}
                aria-label={TYPE_LABEL[b.type]}
                className={`min-w-0 flex-1 resize-none bg-transparent outline-none ${
                  b.type === "h1"
                    ? "text-2xl font-semibold"
                    : b.type === "h2"
                      ? "text-lg font-semibold"
                      : b.type === "code"
                        ? "rounded-md px-2 py-1 font-mono text-[13px]"
                        : b.type === "quote"
                          ? "border-l-2 pl-3 text-[14px] italic"
                          : "text-[14px]"
                } ${b.done ? "text-[var(--tb-muted)] line-through" : "text-[var(--tb-text)]"}`}
                style={
                  b.type === "code"
                    ? { background: "color-mix(in srgb, var(--tb-text) 8%, transparent)" }
                    : b.type === "quote"
                      ? { borderColor: "var(--tb-accent)" }
                      : undefined
                }
              />
            )}

            <button
              type="button"
              aria-label="Bloğu sil"
              onClick={() => setBlocks(note.blocks.filter((x) => x.id !== b.id))}
              className="mt-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5 text-[var(--tb-muted)] hover:text-[var(--tb-text)]" />
            </button>

            {slash === b.id ? (
              <div
                className="tbos-window absolute top-full left-12 z-20 w-48 rounded-xl p-1 shadow-2xl"
                role="menu"
              >
                {(Object.keys(TYPE_LABEL) as BlockType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      patch(b.id, { type: t, text: b.text.replace(/\/$/, "") });
                      setSlash(null);
                    }}
                    className="block w-full rounded-lg px-3 py-1.5 text-left text-[13px] text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)]"
                  >
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={() => addAfter(null)}
          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <Plus className="h-4 w-4" /> Blok ekle
        </button>
      </div>
    </OfficeShell>
  );
}
