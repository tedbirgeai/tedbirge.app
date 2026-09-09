/**
 * TEDBIRGE SLIDES — gömülü sunu aracı
 * Slaytlar JSON olarak şifreli VFS katmanında saklanır; sunum modu
 * tamamen çevrimdışıdır.
 */

import { useMemo, useState } from "react";
import { Play } from "lucide-react";

import { OfficeFrame, ToolButton, useOfficeEditor } from "./OfficeFrame";

type Slide = { title: string; body: string };

function parse(text: string): Slide[] {
  try {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data) && data.length)
      return data.map((s) => ({
        title: String((s as Slide)?.title ?? ""),
        body: String((s as Slide)?.body ?? ""),
      }));
  } catch {
    /* bozuk belge: boş sunu ile devam edilir */
  }
  return [{ title: "Başlık", body: "" }];
}

export function SlidesApp() {
  const editor = useOfficeEditor("slides");
  const slides = useMemo(() => parse(editor.text), [editor.text]);
  const [index, setIndex] = useState(0);
  const [present, setPresent] = useState(false);
  const current = slides[Math.min(index, slides.length - 1)]!;

  const write = (next: Slide[]) => editor.setText(JSON.stringify(next));
  const patch = (p: Partial<Slide>) =>
    write(slides.map((s, i) => (i === index ? { ...s, ...p } : s)));

  return (
    <OfficeFrame
      kind="slides"
      editor={editor}
      toolbar={
        <>
          <ToolButton
            onClick={() => {
              write([...slides, { title: `Slayt ${slides.length + 1}`, body: "" }]);
              setIndex(slides.length);
            }}
            label="Slayt ekle"
          />
          <ToolButton
            onClick={() => setPresent(true)}
            icon={<Play className="h-4 w-4" />}
            label="Sun"
          />
        </>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <div className="flex gap-2 overflow-x-auto">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-16 w-28 shrink-0 rounded-lg p-2 text-left text-[11px] ${
                i === index ? "ring-2 ring-emerald-400" : ""
              }`}
              style={{ border: "1px solid var(--border)", background: "var(--tb-panel-solid)" }}
            >
              <span className="line-clamp-3 text-[var(--tb-text)]">
                {s.title || `Slayt ${i + 1}`}
              </span>
            </button>
          ))}
        </div>

        <input
          value={current.title}
          onChange={(e) => patch({ title: e.target.value })}
          aria-label="Slayt başlığı"
          placeholder="Slayt başlığı"
          className="rounded-lg bg-black/20 px-3 py-2 text-lg font-semibold text-[var(--tb-text)] outline-none"
          style={{ border: "1px solid var(--border)" }}
        />
        <textarea
          value={current.body}
          onChange={(e) => patch({ body: e.target.value })}
          aria-label="Slayt içeriği"
          placeholder="Slayt içeriği"
          className="min-h-0 flex-1 resize-none rounded-lg bg-black/20 p-3 text-[14px] leading-6 text-[var(--tb-text)] outline-none"
          style={{ border: "1px solid var(--border)" }}
        />
      </div>

      {present && (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-6 bg-black p-10 text-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setIndex((i) => (i + 1 < slides.length ? i + 1 : i))}
        >
          <h1 className="text-4xl font-semibold text-white">{current.title}</h1>
          <p className="max-w-3xl whitespace-pre-wrap text-lg text-slate-300">{current.body}</p>
          <div className="absolute right-4 bottom-4 flex items-center gap-3">
            <span className="text-[12px] text-slate-500">
              {index + 1}/{slides.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPresent(false);
              }}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-[12px] text-white"
            >
              Sunumu bitir
            </button>
          </div>
        </div>
      )}
    </OfficeFrame>
  );
}
