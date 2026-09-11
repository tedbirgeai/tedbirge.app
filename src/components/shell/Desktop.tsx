/**
 * MASAÜSTÜ YÜZEYİ (OS kabuğu)
 * ------------------------------------------------------------------
 * Duvar kâğıdı üzerinde serbest sürüklenebilir, ızgaraya oturan simgeler:
 * uygulama kısayolları ve şifreli VFS belgeleri aynı yüzeyde durur.
 * Boş alana sağ tık işletim sistemi menüsünü, sol tuşla sürükleme yarı
 * saydam seçim kutusunu açar. Tarayıcının kendi menüsü her yerde kapalıdır.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Folder, FileText, FileType2, Lock, Presentation, StickyNote, Table2 } from "lucide-react";

import { AppIcon } from "@/components/shell/app-icons";
import { DesktopItem } from "@/components/shell/DesktopItem";
import { DesktopPager } from "@/components/shell/DesktopPager";
import { DesktopIcon } from "@/components/shell/DesktopIcon";
import { UnsupportedFileCard } from "@/components/shell/UnsupportedFileCard";
import { useIsCompact } from "@/hooks/use-mobile";
import { DesktopWidgets } from "@/components/shell/DesktopWidgets";
import { ClockWidget } from "@/components/shell/ClockWidget";
import { ContextMenu, type MenuItem } from "@/components/shell/ContextMenu";
import { AppPropertiesDialog, appMenuItems } from "@/components/shell/AppContextMenu";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import { useWallpaper } from "@/lib/ui/wallpaper";
import {
  deleteFile,
  listFiles,
  onVfsChange,
  readFile,
  renameFile,
  saveFiles,
  type VfsEntry,
} from "@/lib/vfs/store";
import {
  OFFICE_KINDS,
  createDoc,
  displayName,
  kindOf,
  requestOpenDoc,
  type OfficeKind,
} from "@/lib/office/documents";
import {
  DOCK_CLEARANCE,
  alignToGrid,
  clampToGrid,
  flowIntoGrid,
  isLocked,
  metrics,
  setPosition,
  setPositions,
  setSort,
  setView,
  snap,
  toggleLock,
  useDesktopLayout,
  type SortMode,
} from "@/lib/shell/desktop-layout";
import { catalogApp, useDesktopState } from "@/shell/installed";

const TOP_PAD = 160;
const SIDE_PAD = 16;
const FOLDER_MIME = "application/x-tedbirge-folder";

type Menu = { x: number; y: number; appId?: string; fileId?: string };

type Item = {
  key: string;
  type: "app" | "file";
  id: string;
  label: string;
  sortType: string;
  updated: number;
  glyph: ReactNode;
};

/** Uygulama kimliği: belge türüne göre açılacak yerleşik ofis süreci. */
const KIND_APP: Record<OfficeKind, string> = {
  writer: "writer",
  sheets: "sheets",
  slides: "slides",
  notes: "notes",
  organizer: "organizer",
};

function fileGlyph(entry: VfsEntry): ReactNode {
  if (entry.mime === FOLDER_MIME) return <Folder className="h-6 w-6" />;
  if (entry.mime === "application/pdf") return <FileType2 className="h-6 w-6" />;
  const kind = kindOf(entry.name);
  if (kind === "sheets") return <Table2 className="h-6 w-6" />;
  if (kind === "slides") return <Presentation className="h-6 w-6" />;
  if (kind === "notes") return <StickyNote className="h-6 w-6" />;
  return <FileText className="h-6 w-6" />;
}

/** Masaüstünde gösterilecek VFS kayıtları: klasörler, ofis belgeleri, PDF. */
function isDesktopFile(entry: VfsEntry): boolean {
  return (
    entry.mime === FOLDER_MIME || entry.mime === "application/pdf" || kindOf(entry.name) !== null
  );
}

export function Desktop({
  onOpen,
  onOpenNew,
}: {
  onOpen: (id: string) => void;
  onOpenNew: (id: string) => void;
}) {
  const { installed } = useDesktopState();
  const layout = useDesktopLayout();
  const compact = useIsCompact();
  const wallpaper = useWallpaper();

  const [files, setFiles] = useState<VfsEntry[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState<VfsEntry | null>(null);
  const [band, setBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [size, setSize] = useState({ w: 1280, h: 800 });
  const [clipboard, setClipboard] = useState<string | null>(null);

  const hostRef = useRef<HTMLDivElement>(null);
  const bandStart = useRef<{ x: number; y: number } | null>(null);

  /* VFS kayıtları canlı izlenir. */
  useEffect(() => {
    const load = () => void listFiles().then((all) => setFiles(all.filter(isDesktopFile)));
    load();
    return onVfsChange(load);
  }, []);

  /* Yüzey ölçüsü ızgara sütun sayısını belirler. */
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const items = useMemo<Item[]>(() => {
    const apps: Item[] = installed
      .map((id) => catalogApp(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a))
      .map((a) => ({
        key: `app:${a.id}`,
        type: "app" as const,
        id: a.id,
        label: a.label,
        sortType: `0-${a.category}`,
        updated: 0,
        glyph: <AppIcon id={a.id} className="h-6 w-6" />,
      }));

    const docs: Item[] = files.map((f) => ({
      key: `file:${f.id}`,
      type: "file" as const,
      id: f.id,
      label: displayName(f.name).replace(/\.klasor$/i, ""),
      sortType: `1-${f.mime}`,
      updated: f.at,
      glyph: fileGlyph(f),
    }));

    const all = [...apps, ...docs];
    const by: Record<SortMode, (a: Item, b: Item) => number> = {
      ad: (a, b) => a.label.localeCompare(b.label, "tr"),
      tur: (a, b) => a.sortType.localeCompare(b.sortType) || a.label.localeCompare(b.label, "tr"),
      tarih: (a, b) => b.updated - a.updated || a.label.localeCompare(b.label, "tr"),
    };
    return all.sort(by[layout.sort]);
  }, [installed, files, layout.sort]);

  const m = metrics(layout.view);
  const cw = m.w + m.gap;
  const ch = m.h + m.gap;
  /* Alt güvenli alan: yüzen dock'un üzerine son sıra inmez. */
  const rows = Math.max(1, Math.floor((size.h - TOP_PAD - DOCK_CLEARANCE) / ch));

  /* Dolan yerleşim: sürüklenen simgelerin hücreleri korunur,
     diğerleri ilk boş hücreye akar — üzerine binme olamaz. */
  const positions = useMemo(
    () =>
      flowIntoGrid(
        items.map((it) => it.key),
        layout.positions,
        rows,
        TOP_PAD,
        { w: m.w, h: m.h, gap: m.gap },
        SIDE_PAD,
      ),
    [items, layout.positions, rows, m.w, m.h, m.gap],
  );

  const positionOf = useCallback(
    (key: string) => positions[key] ?? { x: SIDE_PAD, y: TOP_PAD },
    [positions],
  );

  /* Yüzey boyutu veya görünüm değişince sınırlar dışına çıkan kayıtlı
     konumlar güvenli alana sıkıştırılır; tamamen dışarıdakiler akışa düşer. */
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  useEffect(() => {
    const l = layoutRef.current;
    const next: Record<string, { x: number; y: number }> = {};
    let dirty = false;
    for (const [key, p] of Object.entries(l.positions)) {
      const c = clampToGrid(p, l.view, TOP_PAD, size);
      if (!c) {
        dirty = true;
        continue;
      }
      next[key] = c;
      if (c.x !== p.x || c.y !== p.y) dirty = true;
    }
    if (dirty) setPositions(next);
  }, [size.w, size.h, layout.view]);

  /* ------------------------------------------------------- seçim kutusu */
  const startBand = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX - r.left, y: e.clientY - r.top };
    bandStart.current = p;
    setBand({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) setSelection([]);
  };

  const moveBand = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = bandStart.current;
    if (!s) return;
    const r = e.currentTarget.getBoundingClientRect();
    const box = { x1: s.x, y1: s.y, x2: e.clientX - r.left, y2: e.clientY - r.top };
    setBand(box);
    const left = Math.min(box.x1, box.x2);
    const right = Math.max(box.x1, box.x2);
    const top = Math.min(box.y1, box.y2);
    const bottom = Math.max(box.y1, box.y2);
    const hit = items
      .filter((it) => {
        const p = positionOf(it.key);
        return p.x < right && p.x + m.w > left && p.y < bottom && p.y + m.h > top;
      })
      .map((it) => it.key);
    setSelection(hit);
  };

  const endBand = () => {
    bandStart.current = null;
    setBand(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------------------------------------------------ eylemler */
  const openItem = useCallback(
    (it: Item) => {
      if (it.type === "app") return onOpen(it.id);
      const entry = files.find((f) => f.id === it.id);
      if (!entry) return;
      if (entry.mime === FOLDER_MIME) return onOpen("files");
      if (entry.mime === "application/pdf") return onOpen("pdf");
      const kind = kindOf(entry.name);
      if (!kind) {
        // Eşleşen uygulama yok: sessizce Dosyalar'a düşmek yerine dürüst kart.
        setUnsupported(entry);
        return;
      }
      requestOpenDoc(kind, entry.id);
      onOpen(KIND_APP[kind]);
    },
    [files, onOpen],
  );

  const newDocument = useCallback(
    async (kind: OfficeKind) => {
      try {
        const entry = await createDoc(kind);
        requestOpenDoc(kind, entry.id);
        onOpen(KIND_APP[kind]);
        notifyOk(`${OFFICE_KINDS[kind].label} oluşturuldu`);
      } catch {
        notifyError("Belge oluşturulamadı", "Yerel depolama kullanılamıyor.");
      }
    },
    [onOpen],
  );

  const newFolder = useCallback(async () => {
    const stamp = new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    try {
      await saveFiles([new File([""], `Yeni klasör ${stamp}.klasor`, { type: FOLDER_MIME })]);
      notifyOk("Yeni klasör oluşturuldu");
    } catch {
      notifyError("Klasör oluşturulamadı", "Yerel depolama kullanılamıyor.");
    }
  }, []);

  const desktopItems: MenuItem[] = [
    {
      label: "Yeni Oluştur",
      children: [
        { label: "Klasör", onSelect: () => void newFolder() },
        { label: "Writer Belgesi", onSelect: () => void newDocument("writer") },
        { label: "Sheets Tablosu", onSelect: () => void newDocument("sheets") },
        { label: "Slides Sunumu", onSelect: () => void newDocument("slides") },
        { label: "Metin Notu", onSelect: () => void newDocument("notes") },
      ],
    },
    {
      label: "Sırala",
      children: [
        { label: "Ada Göre", hint: layout.sort === "ad" ? "✓" : "", onSelect: () => setSort("ad") },
        {
          label: "Türe Göre",
          hint: layout.sort === "tur" ? "✓" : "",
          onSelect: () => setSort("tur"),
        },
        {
          label: "Tarihe Göre",
          hint: layout.sort === "tarih" ? "✓" : "",
          onSelect: () => setSort("tarih"),
        },
      ],
    },
    {
      label: "Görünüm",
      children: [
        {
          label: "Büyük Simgeler",
          hint: layout.view === "buyuk" ? "✓" : "",
          onSelect: () => setView("buyuk"),
        },
        {
          label: "Orta Simgeler",
          hint: layout.view === "orta" ? "✓" : "",
          onSelect: () => setView("orta"),
        },
        {
          label: "Izgaraya Hizala",
          onSelect: () => {
            alignToGrid();
            notifyOk("Simgeler ızgaraya hizalandı");
          },
        },
      ],
    },
    { kind: "sep" },
    { label: "Duvar Kâğıdını Değiştir", onSelect: () => onOpen("wallpaper") },
    { label: "Temayı Özelleştir", onSelect: () => onOpen("wallpaper") },
    { label: "Sistem Ayarları", onSelect: () => onOpen("settings") },
    { label: "Terminali Aç", onSelect: () => onOpen("terminal") },
    { kind: "sep" },
    {
      label: "Kartları Göster",
      onSelect: () => {
        window.localStorage.removeItem("tedbirge:widgets:hidden");
        window.dispatchEvent(new Event("tedbirge:widgets-show"));
        notifyOk("Masaüstü kartları geri geldi");
      },
    },
    {
      label: "Yenile",
      onSelect: () => {
        window.dispatchEvent(new Event("tedbirge:vfs-refresh"));
        notifyOk("Masaüstü yenilendi");
      },
    },
  ];

  const fileMenu = (entry: VfsEntry): MenuItem[] => {
    const locked = isLocked(entry.id);
    const kind = kindOf(entry.name);
    return [
      {
        label: "Aç",
        onSelect: () => {
          const it = items.find((i) => i.key === `file:${entry.id}`);
          if (it) openItem(it);
        },
      },
      {
        label: "Birlikte Aç",
        children: [
          { label: "Dosyalar", onSelect: () => onOpen("files") },
          ...(kind ? [{ label: "Writer", onSelect: () => onOpen("writer") }] : []),
          ...(entry.mime === "application/pdf"
            ? [{ label: "PDF Studio", onSelect: () => onOpen("pdf") }]
            : []),
        ],
      },
      { kind: "sep" },
      {
        label: "Yeniden Adlandır",
        disabled: locked,
        onSelect: () => {
          const next = window.prompt("Yeni ad", displayName(entry.name));
          if (!next) return;
          const ext = entry.name.slice(entry.name.lastIndexOf("."));
          void renameFile(entry.id, next.endsWith(ext) ? next : `${next}${ext}`).then(() =>
            notifyOk("Ad değiştirildi"),
          );
        },
      },
      { label: "Kopyala", onSelect: () => setClipboard(entry.id) },
      {
        label: "Yapıştır",
        disabled: !clipboard,
        onSelect: () => void pasteClipboard(),
      },
      {
        label: locked ? "Kilidi Aç" : "Şifreli VFS'ye Kilitle",
        onSelect: () => {
          const on = toggleLock(entry.id);
          notifyOk(on ? "Belge kilitlendi" : "Kilit kaldırıldı");
        },
      },
      {
        label: "P2P Ağında Paylaş",
        onSelect: () => {
          window.dispatchEvent(
            new CustomEvent("tedbirge:share-file", { detail: { id: entry.id } }),
          );
          onOpen("transfer");
        },
      },
      { kind: "sep" },
      {
        label: "Sil",
        danger: true,
        disabled: locked,
        onSelect: () => {
          void deleteFile(entry.id).then(() => notifyOk("Silindi"));
        },
      },
    ];
  };

  const pasteClipboard = useCallback(async () => {
    if (!clipboard) return;
    const file = await readFile(clipboard);
    if (!file) return;
    const dot = file.name.lastIndexOf(".");
    const base = dot > 0 ? file.name.slice(0, dot) : file.name;
    const ext = dot > 0 ? file.name.slice(dot) : "";
    await saveFiles([new File([file], `${base} kopya${ext}`, { type: file.type })]);
    notifyOk("Kopya oluşturuldu");
  }, [clipboard]);

  const activeFile = menu?.fileId ? files.find((f) => f.id === menu.fileId) : undefined;
  const menuItems: MenuItem[] = menu?.appId
    ? appMenuItems({ id: menu.appId, onOpen, onOpenNew, onProperties: (id) => setProperties(id) })
    : activeFile
      ? fileMenu(activeFile)
      : desktopItems;

  /* --------------------------------------------------------- mobil düzen */
  if (compact) {
    return (
      <div
        className="tbos-wallpaper absolute inset-0 overflow-hidden"
        data-image={wallpaper.id === "aurora" ? "off" : "on"}
        onContextMenu={(e) => {
          e.preventDefault();
          if (e.target !== e.currentTarget) return;
          const r = e.currentTarget.getBoundingClientRect();
          setMenu({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
      >
        <DesktopPager
          ids={installed.filter((id) => catalogApp(id))}
          renderIcon={(id) => {
            const app = catalogApp(id);
            if (!app) return null;
            return (
              <DesktopIcon
                key={id}
                id={id}
                label={app.label}
                selected={selection.includes(`app:${id}`)}
                onSelect={() => setSelection([`app:${id}`])}
                onOpen={() => onOpen(id)}
                onMenu={(pt) => setMenu({ x: pt.x, y: pt.y, appId: id })}
              />
            );
          }}
          onEmptyPointerDown={() => setSelection([])}
        />
        <ClockWidget />
        <DesktopWidgets onOpen={onOpen} />
        {menu ? (
          <ContextMenu
            x={menu.x}
            y={menu.y}
            items={menuItems}
            ariaLabel="Masaüstü menüsü"
            onClose={() => setMenu(null)}
          />
        ) : null}
        {properties ? (
          <AppPropertiesDialog id={properties} onClose={() => setProperties(null)} />
        ) : null}
        {unsupported ? (
          <UnsupportedFileCard entry={unsupported} onClose={() => setUnsupported(null)} />
        ) : null}
      </div>
    );
  }

  /* ------------------------------------------------------- masaüstü düzen */
  return (
    <div
      ref={hostRef}
      className="tbos-wallpaper absolute inset-0 overflow-hidden"
      data-image={wallpaper.id === "aurora" ? "off" : "on"}
      onPointerDown={startBand}
      onPointerMove={moveBand}
      onPointerUp={endBand}
      onPointerCancel={endBand}
      onContextMenu={(e) => {
        e.preventDefault();
        if (e.target !== e.currentTarget) return;
        const r = e.currentTarget.getBoundingClientRect();
        setMenu({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
    >
      {items.map((it) => {
        const pos = positionOf(it.key);
        return (
          <DesktopItem
            key={it.key}
            label={it.label}
            glyph={it.glyph}
            view={layout.view}
            x={pos.x}
            y={pos.y}
            selected={selection.includes(it.key)}
            badge={
              it.type === "file" && isLocked(it.id) ? (
                <Lock className="h-3.5 w-3.5 text-[var(--tb-accent)]" aria-hidden />
              ) : null
            }
            onSelect={(additive) =>
              setSelection((s) =>
                additive
                  ? s.includes(it.key)
                    ? s.filter((k) => k !== it.key)
                    : [...s, it.key]
                  : [it.key],
              )
            }
            onOpen={() => openItem(it)}
            onMove={(p) => setPosition(it.key, p)}
            onMenu={(pt) =>
              setMenu({
                x: pt.x,
                y: pt.y,
                ...(it.type === "app" ? { appId: it.id } : { fileId: it.id }),
              })
            }
          />
        );
      })}

      {/* Sürükleme bitince simge en yakın ızgara hücresine oturur. */}
      <GridSnapper items={items} view={layout.view} bottom={size.h} />

      {band ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-sm"
          style={{
            left: Math.min(band.x1, band.x2),
            top: Math.min(band.y1, band.y2),
            width: Math.abs(band.x2 - band.x1),
            height: Math.abs(band.y2 - band.y1),
            border: "1px solid var(--tb-accent)",
            background: "color-mix(in srgb, var(--tb-accent) 18%, transparent)",
          }}
        />
      ) : null}

      <ClockWidget />
      <DesktopWidgets onOpen={onOpen} />

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          ariaLabel={menu.appId || menu.fileId ? "Öğe menüsü" : "Masaüstü menüsü"}
          onClose={() => setMenu(null)}
        />
      ) : null}

      {properties ? (
        <AppPropertiesDialog id={properties} onClose={() => setProperties(null)} />
      ) : null}

      {unsupported ? (
        <UnsupportedFileCard entry={unsupported} onClose={() => setUnsupported(null)} />
      ) : null}
    </div>
  );
}

/** İşaretçi bırakıldığında serbest konumları ızgaraya oturtur. */
function GridSnapper({
  items,
  view,
  bottom,
}: {
  items: Item[];
  view: "buyuk" | "orta";
  bottom: number;
}) {
  const layout = useDesktopLayout();
  useEffect(() => {
    const onUp = () => {
      for (const it of items) {
        const p = layout.positions[it.key];
        if (!p) continue;
        const s = snap(p, view, TOP_PAD, bottom);
        if (s.x !== p.x || s.y !== p.y) setPosition(it.key, s);
      }
    };
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
  }, [items, layout.positions, view, bottom]);
  return null;
}
