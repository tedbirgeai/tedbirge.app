/**
 * DOCK (Alt Görev Çubuğu)
 * ------------------------------------------------------------------
 * Cam yüzeyli sabit şerit. Solda her koşulda görünen Anasayfa düğmesi,
 * yanında üç kişiselleştirilebilir uygulama yuvası (sürükle-bırak),
 * ardından kurulu uygulamalar ve açık pencere göstergeleri, sağda
 * Mağaza. Tüm dokunma hedefleri en az 48×48 px'dir.
 */

import { useRef, useState } from "react";
import { House } from "lucide-react";

import { AppIcon } from "@/components/shell/app-icons";
import { ContextMenu } from "@/components/shell/ContextMenu";
import { AppPropertiesDialog, appMenuItems } from "@/components/shell/AppContextMenu";
import { catalogApp, useDesktopState } from "@/shell/installed";
import { setDockSlot, swapDockSlots, useDockSlots } from "@/shell/dock-slots";
import {
  closeWindow,
  focusWindow,
  minimizeAll,
  restoreMany,
  restoreWindow,
  type WindowRecord,
} from "@/shell/windows";
import { pushUndo } from "@/lib/shell/undo-stack";
import { notify } from "@/lib/shell/notify";
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
  const { installed } = useDesktopState();
  const slots = useDockSlots();
  const compact = useIsCompact();
  const [menu, setMenu] = useState<{ x: number; y: number; appId: string } | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);
  const hidden = useRef<string[]>([]);
  // Orta bölüm yalnızca O AN AÇIK pencereleri gösterir; kurulu tüm sistem
  // uygulamaları alt çubuğa dizilmez (Nielsen #8 — sade arayüz).
  const ids = Array.from(new Set(windows.map((w) => w.appId))).filter(
    (id) => id !== "store" && !slots.includes(id),
  );
  void installed;

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

  const renderItem = (id: string, opts?: { slot?: number }) => {
    const app = catalogApp(id);
    const win = windows.find((w) => w.appId === id);
    const label = app?.label ?? win?.title ?? id;
    const slot = opts?.slot;
    return (
      <button
        key={slot != null ? `slot-${slot}` : id}
        type="button"
        title={`${label}${slot != null ? " · sürükleyerek değiştirin" : ""}`}
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
                setDropSlot(null);
                const from = e.dataTransfer.getData("text/tbos-slot");
                const app = e.dataTransfer.getData("text/tbos-app");
                if (from) swapDockSlots(Number(from), slot);
                else if (app) setDockSlot(slot, app);
              }
            : undefined
        }
        onClick={() => activate(id)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY - 8, appId: id });
        }}
        className={`tbos-dock-item group relative grid min-h-12 min-w-12 shrink-0 place-items-center rounded-xl px-2 py-1.5 ${
          dropSlot === slot && slot != null ? "tbos-dock-item--drop" : ""
        }`}
      >
        <AppIcon id={id} className="h-5 w-5" />
        <span className="mt-0.5 hidden max-w-16 truncate font-osmono text-[10px] text-[var(--tb-muted)] sm:block">
          {label}
        </span>
        <span
          aria-hidden
          className={`mt-0.5 block h-1 w-1 rounded-full ${
            win ? "bg-[var(--tb-accent)]" : "bg-transparent"
          } ${win?.minimized ? "opacity-40" : ""}`}
        />
      </button>
    );
  };

  return (
    <div
      className="pointer-events-none relative z-[95] flex shrink-0 flex-col items-center px-2 pb-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="tbos-dock pointer-events-auto flex max-w-full items-end gap-3 px-2 py-1.5">
        {/* Sol alt köşe: her koşulda sabit Anasayfa düğmesi. */}
        <button
          type="button"
          onClick={goHome}
          title="Anasayfa · tüm pencereleri topla"
          aria-label="Anasayfa"
          className="tbos-dock-item tbos-dock-home grid min-h-12 min-w-12 shrink-0 place-items-center rounded-xl px-2 py-1.5 text-[var(--tb-accent)]"
        >
          <House className="h-5 w-5" aria-hidden />
          <span className="mt-0.5 hidden font-osmono text-[10px] sm:block">Ana</span>
          <span className="mt-0.5 block h-1 w-1" aria-hidden />
        </button>

        {/* Üç sabit, kişiselleştirilebilir yuva. */}
        <div className="flex shrink-0 items-end gap-3">
          {slots.map((id, i) => renderItem(id, { slot: i }))}
        </div>

        <span className="mx-0.5 h-8 w-px shrink-0 bg-[var(--tb-border)]" />

        <div className="flex min-w-0 items-end gap-3 overflow-x-auto">
          {ids.map((id) => renderItem(id))}
        </div>

        <span className="mx-0.5 h-8 w-px shrink-0 bg-[var(--tb-border)]" />

        <button
          type="button"
          onClick={onStore}
          title="Tedbirge Mağaza"
          aria-label="Tedbirge Mağaza"
          className="tbos-dock-item grid min-h-12 min-w-12 shrink-0 place-items-center rounded-xl px-2 py-1.5 text-[var(--tb-accent)]"
        >
          <AppIcon id="store" className="h-5 w-5" />
          <span className="mt-0.5 hidden font-osmono text-[10px] sm:block">Mağaza</span>
          <span className="mt-0.5 block h-1 w-1" aria-hidden />
        </button>
      </div>

      {/* Alt tutamaç: yatay kaydırma ile uygulamalar arası geçiş. */}
      <div
        aria-hidden
        className="pointer-events-auto mt-1 flex h-5 w-40 max-w-[60%] touch-pan-y items-center justify-center"
        {...swipe}
      >
        <span className="block h-1 w-24 rounded-full bg-[var(--tb-border)]" />
      </div>

      {menu ? (
        <div className="pointer-events-none fixed inset-0 z-[120]">
          <ContextMenu
            x={menu.x}
            y={menu.y}
            items={appMenuItems({
              id: menu.appId,
              onOpen: onLaunch,
              onOpenNew: onLaunchNew,
              onProperties: (id) => setProperties(id),
            })}
            ariaLabel="Uygulama menüsü"
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
