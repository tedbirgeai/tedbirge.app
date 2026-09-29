/**
 * EVRENSEL KOMUTA MERKEZİ (Spotlight Command Palette)
 * ------------------------------------------------------------------
 * Ctrl/Cmd + K veya Alt + Boşluk ile ekranın ortasında açılır. Tek arama
 * çubuğu üzerinden XDG kategorili uygulamalar, cihazdaki yerel dosyalar,
 * rehberdeki kişiler, mesh düğümleri, terminal komutları ve sistem
 * komutları taranır. Tamamen klavyeyle yönetilir; internet gerektirmez.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppWindow, FileText, Radio, Search, SlidersHorizontal, TerminalSquare, User } from "lucide-react";

import { notifyOk } from "@/lib/shell/notify";
import { setFocusMode, isFocusMode } from "@/lib/shell/focus-mode";
import { listFiles, type VfsEntry } from "@/lib/vfs/store";
import { openWithAssociation } from "@/lib/shell/file-association";
import { CATALOG, catalogApp, useDesktopState, xdgOf } from "@/shell/installed";
import { XDG_LABELS } from "@/shell/xdg";
import { useContacts } from "@/lib/chat/contacts";
import { getNodeSnapshot } from "@/lib/node-runtime";
import { COMMANDS } from "@/lib/terminal/commands";
import { SETTINGS_INDEX, fuzzyScore } from "@/lib/shell/settings-index";

type Item = {
  key: string;
  kind: "app" | "file" | "command" | "person" | "peer" | "setting";
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
  const { contacts } = useContacts();
  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<VfsEntry[]>([]);
  const [peers, setPeers] = useState<Array<{ id: string; direct: boolean }>>([]);
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCursor(0);
    listFiles()
      .then(setFiles)
      .catch(() => setFiles([]));
    // Mesh düğümleri açılış anında bir kez okunur: arama titremez.
    const snap = getNodeSnapshot();
    setPeers(snap.peers.map((p) => ({ id: p.nodeId, direct: p.direct })));
    // Odak aynı karede alınır; kullanıcı anında yazabilir.
    input.current?.focus();
    const raf = window.requestAnimationFrame(() => input.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  /** Dosya kendi uygulamasında, OS penceresinde açılır; dış sekme kullanılmaz. */
  const openFile = useCallback(
    (entry: VfsEntry) => {
      const ok = openWithAssociation(entry, onLaunch);
      if (!ok) {
        onLaunch("files");
        notifyOk("Bu tür için eşleşen uygulama yok; Dosyalar açıldı");
      }
    },
    [onLaunch],
  );

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
        hint: XDG_LABELS[xdgOf(a.id)],
        run: () => onLaunch(a.id),
      }));

    const fileItems: Item[] = files.map((f) => ({
      key: `file:${f.id}`,
      kind: "file" as const,
      label: f.name,
      hint: "Yerel dosya",
      run: () => void openFile(f),
    }));

    const people: Item[] = contacts.map((c) => ({
      key: `person:${c.peerId}`,
      kind: "person" as const,
      label: c.displayName,
      hint: `Kişi · ${c.shortId}`,
      run: () => onLaunch("messenger"),
    }));

    const peerItems: Item[] = peers.map((p) => ({
      key: `peer:${p.id}`,
      kind: "peer" as const,
      label: p.id,
      hint: p.direct ? "Mesh düğümü · doğrudan" : "Mesh düğümü · röle",
      run: () => onLaunch("mesh"),
    }));

    const terminal: Item[] = COMMANDS.map((c) => ({
      key: `term:${c.name}`,
      kind: "command" as const,
      label: c.name,
      hint: `Terminal · ${c.summary}`,
      run: () => {
        onLaunch("terminal");
        window.setTimeout(
          () =>
            window.dispatchEvent(
              new CustomEvent("tedbirge:terminal-prefill", { detail: { command: c.name } }),
            ),
          120,
        );
      },
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

    const settings: Item[] = SETTINGS_INDEX.map((st) => ({
      key: `set:${st.key}`,
      kind: "setting" as const,
      label: st.label,
      hint: `Ayar · ${st.keywords.slice(0, 2).join(", ")}`,
      run: () => onLaunch(st.app),
    }));

    const all = [...apps, ...fileItems, ...settings, ...people, ...peerItems, ...commands, ...terminal];
    if (!q) return all.slice(0, 12);
    return all
      .map((i, idx) => ({ i, idx, s: Math.max(fuzzyScore(q, i.label), fuzzyScore(q, i.hint) - 30) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.idx - b.idx)
      .slice(0, 24)
      .map((x) => x.i);
  }, [query, installed, files, contacts, peers, onLaunch, openFile]);

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
      onKeyDown={(e) => {
        // Odak kilidi: Tab panel dışına çıkamaz, Escape kapatır.
        if (e.key === "Escape") onClose();
        if (e.key !== "Tab" || !panel.current) return;
        const nodes = panel.current.querySelectorAll<HTMLElement>("input,button");
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={panel} className="tbos-window w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl">
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
            placeholder="Uygulama, dosya, ayar, kişi veya komut arayın…"
            aria-label="Arama"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--tb-text)] outline-none"
          />
        </div>
        <ul className="max-h-[46vh] overflow-y-auto py-1">
          {items.map((item, i) => {
            const Icon =
              item.kind === "app"
                ? AppWindow
                : item.kind === "file"
                  ? FileText
                  : item.kind === "person"
                    ? User
                    : item.kind === "peer"
                      ? Radio
                      : item.kind === "setting"
                        ? SlidersHorizontal
                        : TerminalSquare;
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
