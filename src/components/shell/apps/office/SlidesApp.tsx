/**
 * TEDBIRGE SLIDES — sunum hazırlama
 * ------------------------------------------------------------------
 * Solda slayt minyatürleri, ortada vektörel tuval: metin kutusu, şekil
 * ve görsel nesneleri sürüklenip boyutlandırılır. "Sunumu Başlat" tam
 * ekran kiosk modunu açar (F5, ok tuşları, Esc).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Image as ImageIcon, Play, Plus, Square, Trash2, Type } from "lucide-react";

import { OfficeShell, RibbonGroup, ToolButton, useOfficeEditor } from "./OfficeFrame";

const W = 960;
const H = 540;

type Obj = {
  id: string;
  type: "text" | "rect" | "ellipse" | "image";
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  src?: string;
  size?: number;
};
type Slide = { id: string; objects: Obj[] };
type Deck = { v: 2; slides: Slide[] };

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Eski başlık/gövde sunularını nesne tabanlı yapıya yükseltir. */
function parseDeck(text: string): Deck {
  try {
    const data = JSON.parse(text) as Deck | Array<{ title?: string; body?: string }>;
    if (Array.isArray(data)) {
      return {
        v: 2,
        slides: data.map((s) => ({
          id: uid(),
          objects: [
            { id: uid(), type: "text", x: 80, y: 90, w: 800, h: 90, text: s.title ?? "", size: 44 },
            { id: uid(), type: "text", x: 80, y: 210, w: 800, h: 240, text: s.body ?? "", size: 24 },
          ],
        })),
      };
    }
    if (data?.slides?.length) return { v: 2, slides: data.slides };
  } catch {
    /* bozuk belge: boş sunu */
  }
  return { v: 2, slides: [{ id: uid(), objects: [] }] };
}

export function SlidesApp() {
  const editor = useOfficeEditor("slides");
  const deck = useMemo(() => parseDeck(editor.text), [editor.text]);
  const [index, setIndex] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [present, setPresent] = useState(false);
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);

  const slide = deck.slides[Math.min(index, deck.slides.length - 1)]!;

  const write = useCallback((next: Deck) => editor.setText(JSON.stringify(next)), [editor]);

  const patchSlide = useCallback(
    (objects: Obj[]) =>
      write({ v: 2, slides: deck.slides.map((s, i) => (i === index ? { ...s, objects } : s)) }),
    [deck, index, write],
  );

  const addObject = (o: Omit<Obj, "id">) => {
    const id = uid();
    patchSlide([...slide.objects, { ...o, id }]);
    setSel(id);
  };

  /* Tuval, pencere genişliğine göre ölçeklenir. */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, (el.clientWidth - 32) / W)));
    ro.observe(el);
    setScale(Math.min(1, (el.clientWidth - 32) / W));
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F5") {
        e.preventDefault();
        setPresent(true);
      }
      if (!present) return;
      if (e.key === "Escape") setPresent(false);
      if (e.key === "ArrowRight" || e.key === " ")
        setIndex((i) => Math.min(deck.slides.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [present, deck.slides.length]);

  const drag = useRef<{ id: string; dx: number; dy: number; resize: boolean } | null>(null);

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    patchSlide(
      slide.objects.map((o) =>
        o.id !== d.id
          ? o
          : d.resize
            ? { ...o, w: Math.max(40, px - o.x), h: Math.max(30, py - o.y) }
            : { ...o, x: Math.max(0, px - d.dx), y: Math.max(0, py - d.dy) },
      ),
    );
  };

  const pickImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () =>
        addObject({ type: "image", x: 120, y: 120, w: 400, h: 260, src: String(reader.result) });
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const renderObj = (o: Obj, editable: boolean) => {
    const base: React.CSSProperties = {
      position: "absolute",
      left: o.x,
      top: o.y,
      width: o.w,
      height: o.h,
    };
    if (o.type === "image")
      return <img key={o.id} src={o.src} alt="" style={base} className="object-contain" />;
    if (o.type === "rect" || o.type === "ellipse")
      return (
        <span
          key={o.id}
          style={{
            ...base,
            background: "color-mix(in srgb, var(--tb-accent) 55%, transparent)",
            borderRadius: o.type === "ellipse" ? "50%" : 8,
          }}
        />
      );
    return (
      <div
        key={o.id}
        style={{ ...base, fontSize: o.size ?? 28, color: "#f8fafc", lineHeight: 1.3 }}
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) =>
          patchSlide(
            slide.objects.map((x) => (x.id === o.id ? { ...x, text: e.currentTarget.innerText } : x)),
          )
        }
        className="whitespace-pre-wrap outline-none"
      >
        {o.text}
      </div>
    );
  };

  const tabs = [
    {
      id: "giris",
      label: "Giriş",
      content: (
        <>
          <RibbonGroup label="Slayt">
            <ToolButton
              onClick={() => {
                write({ v: 2, slides: [...deck.slides, { id: uid(), objects: [] }] });
                setIndex(deck.slides.length);
              }}
              icon={<Plus className="h-4 w-4" />}
              label="Yeni slayt"
            />
            <ToolButton
              onClick={() => {
                if (deck.slides.length < 2) return;
                write({ v: 2, slides: deck.slides.filter((_, i) => i !== index) });
                setIndex(0);
              }}
              icon={<Trash2 className="h-4 w-4" />}
              label="Sil"
            />
          </RibbonGroup>
          <RibbonGroup label="Ekle">
            <ToolButton
              onClick={() =>
                addObject({ type: "text", x: 100, y: 120, w: 600, h: 120, text: "Metin", size: 32 })
              }
              icon={<Type className="h-4 w-4" />}
              label="Metin"
            />
            <ToolButton
              onClick={() => addObject({ type: "rect", x: 140, y: 160, w: 260, h: 160 })}
              icon={<Square className="h-4 w-4" />}
              label="Dikdörtgen"
            />
            <ToolButton
              onClick={() => addObject({ type: "ellipse", x: 180, y: 180, w: 200, h: 200 })}
              icon={<Circle className="h-4 w-4" />}
              label="Elips"
            />
            <ToolButton
              onClick={pickImage}
              icon={<ImageIcon className="h-4 w-4" />}
              label="Görsel"
            />
          </RibbonGroup>
          <RibbonGroup label="Sunum">
            <ToolButton
              onClick={() => setPresent(true)}
              icon={<Play className="h-4 w-4" />}
              label="Sunumu Başlat (F5)"
            />
          </RibbonGroup>
        </>
      ),
    },
  ];

  return (
    <OfficeShell
      kind="slides"
      editor={editor}
      tabs={tabs}
      sidebar={false}
      status={
        <span>
          Slayt {index + 1}/{deck.slides.length}
        </span>
      }
    >
      <div className="flex min-h-0 flex-1">
        <aside
          className="w-40 shrink-0 space-y-2 overflow-y-auto border-r p-2"
          style={{ borderColor: "var(--border)" }}
        >
          {deck.slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Slayt ${i + 1}`}
              className={`relative block h-20 w-full overflow-hidden rounded-lg ${
                i === index ? "ring-2 ring-[var(--tb-accent)]" : ""
              }`}
              style={{ border: "1px solid var(--border)", background: "#0b1220" }}
            >
              <span
                className="absolute top-0 left-0 origin-top-left"
                style={{ width: W, height: H, transform: "scale(0.14)" }}
              >
                {s.objects.map((o) => renderObj(o, false))}
              </span>
              <span className="absolute right-1 bottom-1 font-osmono text-[10px] text-[var(--tb-muted)]">
                {i + 1}
              </span>
            </button>
          ))}
        </aside>

        <div ref={stageRef} className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
          <div
            className="relative mx-auto overflow-hidden rounded-xl"
            style={{
              width: W * scale,
              height: H * scale,
              background: "#0b1220",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="absolute top-0 left-0"
              style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
            >
              {slide.objects.map((o) => (
                <div
                  key={o.id}
                  onPointerDown={(e) => {
                    setSel(o.id);
                    const host = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                    drag.current = {
                      id: o.id,
                      dx: (e.clientX - host.left) / scale - o.x,
                      dy: (e.clientY - host.top) / scale - o.y,
                      resize: false,
                    };
                  }}
                  style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}
                  className="pointer-events-none"
                >
                  <span className="pointer-events-auto">{renderObj(o, true)}</span>
                  {sel === o.id ? (
                    <>
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: o.x,
                          top: o.y,
                          width: o.w,
                          height: o.h,
                          outline: "1px dashed var(--tb-accent)",
                        }}
                      />
                      <span
                        role="presentation"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          drag.current = { id: o.id, dx: 0, dy: 0, resize: true };
                        }}
                        className="pointer-events-auto"
                        style={{
                          position: "absolute",
                          left: o.x + o.w - 6,
                          top: o.y + o.h - 6,
                          width: 12,
                          height: 12,
                          background: "var(--tb-accent)",
                          borderRadius: 3,
                          cursor: "nwse-resize",
                        }}
                      />
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {sel ? (
            <div className="mx-auto mt-3 flex w-fit gap-2">
              <ToolButton
                onClick={() => {
                  patchSlide(slide.objects.filter((o) => o.id !== sel));
                  setSel(null);
                }}
                icon={<Trash2 className="h-4 w-4" />}
                label="Nesneyi sil"
              />
              <ToolButton
                onClick={() => {
                  const o = slide.objects.find((x) => x.id === sel);
                  if (!o) return;
                  patchSlide([...slide.objects.filter((x) => x.id !== sel), o]);
                }}
                label="Öne getir"
              />
            </div>
          ) : null}
        </div>
      </div>

      {present ? (
        <div
          className="fixed inset-0 z-[140] grid place-items-center bg-black"
          role="dialog"
          aria-modal="true"
          onClick={() => setIndex((i) => Math.min(deck.slides.length - 1, i + 1))}
        >
          <div className="relative" style={{ width: "min(100vw, 177vh)", aspectRatio: "16/9" }}>
            <div
              className="absolute top-0 left-0 origin-top-left"
              style={{ width: W, height: H, transform: "scale(var(--tb-present-scale,1))" }}
              ref={(el) => {
                if (!el) return;
                const parent = el.parentElement!;
                el.style.setProperty("--tb-present-scale", String(parent.clientWidth / W));
              }}
            >
              {slide.objects.map((o) => renderObj(o, false))}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPresent(false);
            }}
            className="absolute right-4 bottom-4 rounded-lg px-3 py-1.5 text-[12px] text-white"
            style={{ border: "1px solid rgba(255,255,255,0.25)" }}
          >
            Sunumu bitir (Esc)
          </button>
        </div>
      ) : null}
    </OfficeShell>
  );
}
