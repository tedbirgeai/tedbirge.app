/**
 * TEDBIRGE PDF STUDIO — PDF inceleme ve işaretleme
 * ------------------------------------------------------------------
 * PDF motoru (pdfjs) uygulama paketine gömülüdür; hiçbir kaynak dış
 * ağdan çekilmez. Sol panelde sayfa minyatürleri, ortada yüksek
 * çözünürlüklü tuval, üstte vurgulama/not/çizim araçları bulunur.
 * Açıklamalar belgeyle birlikte şifreli VFS katmanına yazılır.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Highlighter, MousePointer2, Pencil, Printer, Save, StickyNote, Trash2 } from "lucide-react";

import { displayName } from "@/lib/office/documents";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import {
  deleteFile,
  listFiles,
  readDocument,
  readFile,
  saveFiles,
  onVfsChange,
  writeDocument,
  type VfsEntry,
} from "@/lib/vfs/store";

type Tool = "sec" | "vurgu" | "not" | "cizim";
type Mark = {
  id: string;
  page: number;
  tool: Exclude<Tool, "sec">;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  path?: Array<[number, number]>;
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const notesName = (name: string) => `${name}.isaret.json`;

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (o: { scale: number }) => { width: number; height: number };
    render: (o: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void> };
  }>;
};

export function PdfStudioApp() {
  const [docs, setDocs] = useState<VfsEntry[]>([]);
  const [active, setActive] = useState<VfsEntry | null>(null);
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1.2);
  const [tool, setTool] = useState<Tool>("sec");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<Mark | null>(null);

  /* VFS'teki PDF'ler */
  useEffect(() => {
    const load = () =>
      void listFiles().then((all) => setDocs(all.filter((f) => f.mime === "application/pdf")));
    load();
    return onVfsChange(load);
  }, []);

  /* Seçilen belgeyi gömülü motorla açar */
  useEffect(() => {
    let cancelled = false;
    if (!active) {
      setPdf(null);
      setMarks([]);
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        const [pdfjs, workerUrl, file, saved] = await Promise.all([
          import("pdfjs-dist"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url").then((m) => m.default as string),
          readFile(active.id),
          readDocument(`${active.id}__isaret`).catch(() => null),
        ]);
        if (!file || cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        const buf = await file.arrayBuffer();
        const doc = (await pdfjs.getDocument({ data: buf }).promise) as unknown as PdfDoc;
        if (cancelled) return;
        setPdf(doc);
        setPage(1);
        setMarks(saved ? (JSON.parse(saved) as Mark[]) : []);
      } catch {
        if (!cancelled) notifyError("PDF açılamadı", "Dosya bozuk veya desteklenmiyor.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  /* Ana sayfa çizimi */
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void (async () => {
      const p = await pdf.getPage(page);
      const viewport = p.getViewport({ scale: zoom });
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || cancelled) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await p.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, page, zoom]);

  /* Minyatürler */
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    void (async () => {
      const host = thumbsRef.current;
      if (!host) return;
      host.innerHTML = "";
      for (let n = 1; n <= pdf.numPages; n++) {
        const p = await pdf.getPage(n);
        const viewport = p.getViewport({ scale: 0.22 });
        const c = document.createElement("canvas");
        c.width = viewport.width;
        c.height = viewport.height;
        const ctx = c.getContext("2d");
        if (!ctx || cancelled) return;
        await p.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled) return;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "block w-full rounded-md p-0.5";
        btn.style.border = "1px solid var(--border)";
        btn.setAttribute("aria-label", `Sayfa ${n}`);
        btn.onclick = () => setPage(n);
        btn.appendChild(c);
        host.appendChild(btn);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  const saveMarks = useCallback(async () => {
    if (!active) return;
    try {
      await writeDocument({
        id: `${active.id}__isaret`,
        name: notesName(displayName(active.name)),
        mime: "application/json",
        text: JSON.stringify(marks),
      });
      notifyOk("İşaretler kaydedildi");
    } catch {
      notifyError("İşaretler kaydedilemedi");
    }
  }, [active, marks]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tool === "sec" || !pdf) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (tool === "not") {
      const text = window.prompt("Not");
      if (!text) return;
      setMarks((m) => [...m, { id: uid(), page, tool: "not", x, y, w: 180, h: 0, text }]);
      return;
    }
    dragRef.current = {
      id: uid(),
      page,
      tool,
      x,
      y,
      w: 0,
      h: 0,
      ...(tool === "cizim" ? { path: [[x, y]] as Array<[number, number]> } : {}),
    };
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (d.tool === "cizim") d.path = [...(d.path ?? []), [x, y]];
    else {
      d.w = x - d.x;
      d.h = y - d.y;
    }
    setMarks((m) => [...m.filter((x2) => x2.id !== d.id), { ...d }]);
  };

  const onUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex flex-wrap items-center gap-1.5 border-b p-2"
        style={{ borderColor: "var(--border)" }}
      >
        <Btn onClick={() => fileRef.current?.click()} icon={<FileUp className="h-4 w-4" />} label="PDF ekle" />
        <span className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
        <Btn onClick={() => setTool("sec")} icon={<MousePointer2 className="h-4 w-4" />} label="Seç" on={tool === "sec"} />
        <Btn onClick={() => setTool("vurgu")} icon={<Highlighter className="h-4 w-4" />} label="Vurgula" on={tool === "vurgu"} />
        <Btn onClick={() => setTool("not")} icon={<StickyNote className="h-4 w-4" />} label="Not" on={tool === "not"} />
        <Btn onClick={() => setTool("cizim")} icon={<Pencil className="h-4 w-4" />} label="Çizim" on={tool === "cizim"} />
        <span className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
        <Btn onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} label="−" />
        <span className="font-osmono text-[11px] text-[var(--tb-muted)]">%{Math.round(zoom * 100)}</span>
        <Btn onClick={() => setZoom((z) => Math.min(3, z + 0.2))} label="+" />
        <span className="mx-1 h-5 w-px" style={{ background: "var(--border)" }} />
        <Btn onClick={() => void saveMarks()} icon={<Save className="h-4 w-4" />} label="VFS'ye kaydet" />
        <Btn onClick={() => window.print()} icon={<Printer className="h-4 w-4" />} label="Yazdır" />
        <Btn
          onClick={() => {
            if (!active) return;
            void deleteFile(active.id);
            setActive(null);
          }}
          icon={<Trash2 className="h-4 w-4" />}
          label="Sil"
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) void saveFiles(files, "Belgeler");
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside
          className="w-52 shrink-0 space-y-2 overflow-y-auto border-r p-2"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="font-osmono text-[11px] tracking-wide text-[var(--tb-muted)] uppercase">
            Belgeler
          </p>
          {docs.length === 0 && (
            <p className="text-[12px] text-[var(--tb-muted)]">Kayıtlı PDF yok.</p>
          )}
          {docs.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setActive(d)}
              className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-[13px] ${
                d.id === active?.id
                  ? "bg-[color-mix(in_srgb,var(--tb-accent)_18%,transparent)] text-[var(--tb-text)]"
                  : "text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
              }`}
            >
              {displayName(d.name)}
            </button>
          ))}
          {pdf ? (
            <>
              <p className="pt-2 font-osmono text-[11px] tracking-wide text-[var(--tb-muted)] uppercase">
                Sayfalar
              </p>
              <div ref={thumbsRef} className="space-y-1.5" />
            </>
          ) : null}
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
          {busy ? (
            <p className="text-center text-[13px] text-[var(--tb-muted)]">Belge açılıyor…</p>
          ) : null}
          {!active && !busy ? (
            <p className="pt-10 text-center text-[13px] text-[var(--tb-muted)]">
              Soldan bir PDF seçin veya cihazınızdan ekleyin. Dosyalar cihazda kalır.
            </p>
          ) : null}

          {active ? (
            <div
              className="relative mx-auto w-fit"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              style={{ cursor: tool === "sec" ? "default" : "crosshair" }}
            >
              <canvas ref={canvasRef} className="block rounded-sm bg-white shadow-2xl" />
              {marks
                .filter((m) => m.page === page)
                .map((m) =>
                  m.tool === "not" ? (
                    <span
                      key={m.id}
                      className="absolute rounded-md px-2 py-1 text-[11px] text-[var(--tb-text)]"
                      style={{
                        left: m.x,
                        top: m.y,
                        maxWidth: m.w,
                        background: "color-mix(in srgb, var(--tb-accent) 30%, transparent)",
                      }}
                    >
                      {m.text}
                    </span>
                  ) : m.tool === "vurgu" ? (
                    <span
                      key={m.id}
                      aria-hidden
                      className="pointer-events-none absolute"
                      style={{
                        left: Math.min(m.x, m.x + m.w),
                        top: Math.min(m.y, m.y + m.h),
                        width: Math.abs(m.w),
                        height: Math.abs(m.h),
                        background: "color-mix(in srgb, #fde047 45%, transparent)",
                      }}
                    />
                  ) : (
                    <svg
                      key={m.id}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      <polyline
                        points={(m.path ?? []).map(([x, y]) => `${x},${y}`).join(" ")}
                        fill="none"
                        stroke="var(--tb-accent)"
                        strokeWidth={2}
                      />
                    </svg>
                  ),
                )}
            </div>
          ) : null}

          {pdf ? (
            <p className="pt-3 text-center font-osmono text-[11px] text-[var(--tb-muted)]">
              Sayfa {page}/{pdf.numPages}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Btn({
  onClick,
  icon,
  label,
  on,
}: {
  onClick: () => void;
  icon?: React.ReactNode;
  label: string;
  on?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`wa-press flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] ${
        on
          ? "bg-[color-mix(in_srgb,var(--tb-accent)_20%,transparent)] text-[var(--tb-text)]"
          : "text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-text)_8%,transparent)]"
      }`}
      style={{ border: "1px solid var(--border)" }}
    >
      {icon}
      {label}
    </button>
  );
}
