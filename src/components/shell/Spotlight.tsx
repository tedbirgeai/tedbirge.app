/**
 * EVRENSEL ARAMA (Spotlight)
 * ------------------------------------------------------------------
 * Ctrl/Cmd + Boşluk ile ekranın ortasında açılır. Kurulu uygulamaları,
 * cihazdaki yerel dosyaları ve sistem komutlarını tek listede bulur.
 * Tamamen klavyeyle yönetilir; internet gerektirmez.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppWindow, FileText, Search, TerminalSquare } from "lucide-react";

import { notifyOk } from "@/lib/shell/notify";
import { setFocusMode, isFocusMode } from "@/lib/shell/focus-mode";
import { listFiles, objectUrl, type VfsEntry } from "@/lib/vfs/store";
import { CATALOG, catalogApp, useDesktopState } from "@/shell/installed";

type Item = {
  key: string;
  kind: "app" | "file" | "command";
  label: string;
  hint: string;
  run: () => void;
};

export function Spotlight({
  open,
  onClose,
  onLaunch,
}: {
  open: boolean;
  onClose: () => void;
  onLaunch: (id: string) => void;
}) {
  const { installed } = useDesktopState();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<VfsEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    listFiles()
      .then(setFiles)
      .catch(() => setFiles([]));
    const t = window.setTimeout(() => input.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open]);

  const openFile = useCallback(async (entry: VfsEntry) => {
    const url = await objectUrl(entry.id);
    if (url) window.open(url, "_blank", "noopener");
  }, []);

  const items = useMemo<Item[]>(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    // Kurulu uygulamalar önce; katalogdaki diğer hedefler de aranabilir.
    const appIds = [...new Set([...installed, ...CATALOG.map((a) => a.id)])];

    const apps: Item[] = appIds
      .map((id) => catalogApp(id))
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({
        key: `app:${a.id}`,
        kind: "app" as const,
        label: a.label,
        hint: "Uygulama",
        run: () => onLaunch(a.id),
      }));

    const fileItems: Item[] = files.map((f) => ({
      key: `file:${f.id}`,
      kind: "file" as const,
      label: f.name,
      hint: "Yerel dosya",
      run: () => void openFile(f),
    }));

    const commands: Item[] = [
      {
        key: "cmd:wallpaper",
        kind: "command",
        label: "Duvar kâğıdı ve tema",
        hint: "Sistem komutu",
        run: () => onLaunch("wallpaper"),
      },
      {
        key: "cmd:settings",
        kind: "command",
        label: "Sistem ayarları",
        hint: "Sistem komutu",
        run: () => onLaunch("computer"),
      },
      {
        key: "cmd:mesh",
        kind: "command",
        label: "Mesh ağ durumu",
        hint: "Sistem komutu",
        run: () => onLaunch("mesh"),
      },
      {
        key: "cmd:focus",
        kind: "command",
        label: "Odak modunu aç/kapat",
        hint: "Sistem komutu",
        run: () => {
          const next = !isFocusMode();
          setFocusMode(next);
          notifyOk(next ? "Odak modu açık" : "Odak modu kapalı");
        },
      },
    ];

    const all = [...apps, ...fileItems, ...commands];
    if (!q) return all.slice(0, 12);
    return all.filter((i) => i.label.toLocaleLowerCase("tr").includes(q)).slice(0, 12);
  }, [query, installed, files, onLaunch, openFile]);

  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  const choose = (item: Item | undefined) => {
    if (!item) return;
    item.run();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/30 p-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Evrensel arama"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="tbos-window w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2 border-b border-[var(--tb-border)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--tb-muted)]" aria-hidden />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => (items.length ? (c + 1) % items.length : 0));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => (items.length ? (c - 1 + items.length) % items.length : 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                choose(items[cursor]);
              } else if (e.key === "Escape") {
                onClose();
              }
            }}
            placeholder="Uygulama, dosya veya komut arayın…"
            aria-label="Arama"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--tb-text)] outline-none"
          />
        </div>
        <ul className="max-h-[46vh] overflow-y-auto py-1">
          {items.map((item, i) => {
            const Icon =
              item.kind === "app" ? AppWindow : item.kind === "file" ? FileText : TerminalSquare;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => choose(item)}
                  aria-current={i === cursor}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${
                    i === cursor ? "bg-[var(--tb-accent)]/10" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--tb-accent)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--tb-text)]">
                    {item.label}
                  </span>
                  <span className="font-osmono text-[10.5px] text-[var(--tb-muted)]">
                    {item.hint}
                  </span>
                </button>
              </li>
            );
          })}
          {items.length === 0 ? (
            <li className="px-4 py-8 text-center font-osmono text-[12px] text-[var(--tb-muted)]">
              Sonuç yok.
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
