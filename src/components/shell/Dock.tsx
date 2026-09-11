/**
 * YÜZEN CAM DOCK (Floating Glass Dock)
 * ------------------------------------------------------------------
 * Ekranın altından 8 px yukarıda yüzen, 46 px yüksekliğinde cam şerit.
 * Solda her koşulda görünen Anasayfa düğmesi, yanında sabitlenmiş
 * uygulamalar (sürükle-bırak ile sıralanır ve sabitlenir), ardından açık
 * pencere göstergeleri, sağda Mağaza. Tüm dokunma hedefleri en az
 * 44×44 px'dir; çalışan uygulamaların altında aktiflik göstergesi vardır.
 */

import { useRef, useState } from "react";
import { House } from "lucide-react";

import { AppIcon } from "@/components/shell/app-icons";
import { ContextMenu, type MenuItem } from "@/components/shell/ContextMenu";
import { AppPropertiesDialog, appMenuItems } from "@/components/shell/AppContextMenu";
import { catalogApp } from "@/shell/installed";
import { movePin, pinApp, useDockSlots } from "@/shell/dock-slots";
import {
  closeWindow,
  focusWindow,
  minimizeAll,
  restoreMany,
  restoreWindow,
  toggleMaximize,
  type WindowRecord,
} from "@/shell/windows";
import { pushUndo } from "@/lib/shell/undo-stack";
import { notify, notifyOk } from "@/lib/shell/notify";
import { useIsCompact } from "@/hooks/use-mobile";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

export function Dock({
  windows,
  onLaunch,
  onLaunchNew,
  onStore,
}: {
  windows: WindowRecord[];
  onLaunch: (id: string) => void;
  onLaunchNew: (id: string) => void;
  onStore: () => void;
}) {
  const slots = useDockSlots();
  const compact = useIsCompact();
  const [menu, setMenu] = useState<{ x: number; y: number; appId: string | null } | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const [dropZone, setDropZone] = useState(false);
  const hidden = useRef<string[]>([]);
  // Orta bölüm yalnızca O AN AÇIK pencereleri gösterir; kurulu tüm sistem
  // uygulamaları alt çubuğa dizilmez (Nielsen #8 — sade arayüz).
  const ids = Array.from(new Set(windows.map((w) => w.appId))).filter(
    (id) => id !== "store" && !slots.includes(id),
  );

  // Alt tutamaç üzerinde sağa/sola kaydırma: açık uygulamalar arası geçiş.
  const swipe = useSwipeGesture((dir) => {
    const order = [...windows].filter((w) => !w.minimized).sort((a, b) => a.id.localeCompare(b.id));
    if (order.length < 2) return;
    const top = [...windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
    const i = Math.max(
      0,
      order.findIndex((w) => w.id === top?.id),
    );
    const step = dir === "left" ? 1 : -1;
    const next = order[(i + step + order.length) % order.length];
    if (next && next.id !== top?.id) focusWindow(next.id);
  });

  /** Anasayfa: tüm pencereleri toplar; ikinci dokunuş geri getirir. */
  const goHome = () => {
    if (hidden.current.length) {
      restoreMany(hidden.current);
      hidden.current = [];
      return;
    }
    const ids = minimizeAll();
    hidden.current = ids;
    if (ids.length) {
      pushUndo({ label: "Pencereler küçültüldü", undo: () => restoreMany(ids) });
      notify("Ana ekran", "Açık uygulamalar alt çubuğa toplandı.");
    }
  };

  const activate = (id: string) => {
    const win = windows.find((w) => w.appId === id);
    if (!win) return onLaunch(id);
    if (win.minimized) return restoreWindow(win.id);
    if (compact) return closeWindow(win.id);
    focusWindow(win.id);
  };

  /** Dock zemini: uygulama, pencere ve masaüstü eylemleri. */
  const dockMenu = (): MenuItem[] => [
    { label: "Masaüstünü Göster", onSelect: goHome },
    {
      label: "Tüm Pencereleri Geri Getir",
      disabled: !windows.some((w) => w.minimized),
      onSelect: () => restoreMany(windows.filter((w) => w.minimized).map((w) => w.id)),
    },
    { kind: "sep" },
    { label: "Görev Yöneticisi", onSelect: () => onLaunch("system") },
    { label: "Mağazayı Aç", onSelect: onStore },
  ];

  /** Uygulama simgesi menüsü: sabitleme ve pencere eylemleri eklenir. */
  const itemMenu = (id: string): MenuItem[] => {
    const win = windows.find((w) => w.appId === id);
    return appMenuItems({
      id,
      onOpen: onLaunch,
      onOpenNew: onLaunchNew,
      onProperties: (appId) => setProperties(appId),
      extra: [
        {
          label: "Pencereyi Küçült/Büyüt",
          disabled: !win,
          onSelect: () => {
            if (win) toggleMaximize(win.id);
          },
        },
        {
          label: "Pencereyi Kapat",
          disabled: !win,
          onSelect: () => {
            if (win) closeWindow(win.id);
          },
        },
        { label: "Görev Yöneticisi", onSelect: () => onLaunch("system") },
      ],
    });
  };

  const renderItem = (id: string, opts?: { slot?: number }) => {
    const app = catalogApp(id);
    const win = windows.find((w) => w.appId === id);
    const label = app?.label ?? win?.title ?? id;
    const slot = opts?.slot;
    return (
      <button
        key={slot != null ? `slot-${slot}-${id}` : id}
        type="button"
        title={`${label}${slot != null ? " · sürükleyerek sıralayın" : ""}`}
        aria-label={label}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/tbos-app", id);
          if (slot != null) e.dataTransfer.setData("text/tbos-slot", String(slot));
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={
          slot != null
            ? (e) => {
                e.preventDefault();
                setDropSlot(slot);
              }
            : undefined
        }
        onDragLeave={slot != null ? () => setDropSlot(null) : undefined}
        onDrop={
          slot != null
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropSlot(null);
                const from = e.dataTransfer.getData("text/tbos-slot");
                const dragged = e.dataTransfer.getData("text/tbos-app");
                if (from) movePin(Number(from), slot);
                else if (dragged && pinApp(dragged, slot))
                  notifyOk("Dock'a sabitlendi", catalogApp(dragged)?.label ?? dragged);
              }
            : undefined
        }
        onClick={() => activate(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY - 8, appId: id });
        }}
        className={`tbos-dock-item group relative grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl px-2 py-1 ${
          dropSlot === slot && slot != null ? "tbos-dock-item--drop" : ""
        }`}
      >
        <AppIcon id={id} className="h-5 w-5" />
        <span className="sr-only">{label}</span>
        <span
          aria-hidden
          className={`mt-1 block rounded-full transition-all ${
            win
              ? win.minimized
                ? "h-1 w-1 bg-[var(--tb-accent)] opacity-50"
                : "h-1 w-3 bg-[var(--tb-accent)]"
              : "h-1 w-1 bg-transparent"
          }`}
        />
      </button>
    );
  };

  return (
    <div
      className="pointer-events-none relative z-[95] flex shrink-0 flex-col items-center px-2 pb-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={`tbos-dock tbos-dock--float pointer-events-auto flex max-w-full items-center gap-2 px-2 ${
          dropZone ? "tbos-dock--dropzone" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDropZone(true);
        }}
        onDragLeave={() => setDropZone(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDropZone(false);
          const dragged = e.dataTransfer.getData("text/tbos-app");
          if (dragged && pinApp(dragged))
            notifyOk("Dock'a sabitlendi", catalogApp(dragged)?.label ?? dragged);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY - 8, appId: null });
        }}
      >
        {/* Sol alt köşe: her koşulda sabit Anasayfa düğmesi. */}
        <button
          type="button"
          onClick={goHome}
          title="Anasayfa · tüm pencereleri topla"
          aria-label="Anasayfa"
          className="tbos-dock-item tbos-dock-home grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl px-2 py-1 text-[var(--tb-accent)]"
        >
          <House className="h-5 w-5" aria-hidden />
          <span className="mt-1 block h-1 w-1" aria-hidden />
        </button>

        {/* Sabitlenmiş uygulamalar: sürükleyerek sırala, sürükleyip sabitle. */}
        <div className="flex shrink-0 items-center gap-2">
          {slots.map((id, i) => renderItem(id, { slot: i }))}
        </div>

        <span className="mx-0.5 h-7 w-px shrink-0 bg-[var(--tb-border)]" />

        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {ids.map((id) => renderItem(id))}
        </div>

        <span className="mx-0.5 h-7 w-px shrink-0 bg-[var(--tb-border)]" />

        <button
          type="button"
          onClick={onStore}
          title="Tedbirge Mağaza"
          aria-label="Tedbirge Mağaza"
          className="tbos-dock-item grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl px-2 py-1 text-[var(--tb-accent)]"
        >
          <AppIcon id="store" className="h-5 w-5" />
          <span className="mt-1 block h-1 w-1" aria-hidden />
        </button>
      </div>

      {/* Alt tutamaç: yatay kaydırma ile uygulamalar arası geçiş. */}
      <div
        aria-hidden
        className="pointer-events-auto mt-1 flex h-4 w-40 max-w-[60%] touch-pan-y items-center justify-center"
        {...swipe}
      >
        <span className="block h-1 w-24 rounded-full bg-[var(--tb-border)]" />
      </div>

      {menu ? (
        <div className="pointer-events-none fixed inset-0 z-[120]">
          <ContextMenu
            x={menu.x}
            y={menu.y}
            items={menu.appId ? itemMenu(menu.appId) : dockMenu()}
            ariaLabel={menu.appId ? "Uygulama menüsü" : "Dock menüsü"}
            onClose={() => setMenu(null)}
          />
        </div>
      ) : null}

      {properties ? (
        <div className="pointer-events-auto fixed inset-0 z-[130]">
          <AppPropertiesDialog id={properties} onClose={() => setProperties(null)} />
        </div>
      ) : null}
    </div>
  );
}
