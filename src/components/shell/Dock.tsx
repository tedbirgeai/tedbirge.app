/**
 * DOCK (Görev Çubuğu)
 * ------------------------------------------------------------------
 * Alt kısımda cam yüzeyli şerit: kurulu uygulamalar sabit simge olarak
 * durur, açık pencereler simgenin altında nokta ile işaretlenir.
 * Küçültülmüş pencere kendi simgesine tıklanınca geri gelir. Simgeye
 * sağ tıklandığında tarayıcı menüsü değil, işletim sistemi menüsü açılır.
 */

import { useState } from "react";

import { AppIcon } from "@/components/shell/app-icons";
import { ContextMenu } from "@/components/shell/ContextMenu";
import { AppPropertiesDialog, appMenuItems } from "@/components/shell/AppContextMenu";
import { catalogApp, useDesktopState } from "@/shell/installed";
import { closeWindow, focusWindow, restoreWindow, type WindowRecord } from "@/shell/windows";
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
  const compact = useIsCompact();
  const [menu, setMenu] = useState<{ x: number; y: number; appId: string } | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const extra = windows.filter((w) => !installed.includes(w.appId)).map((w) => w.appId);
  // Mağaza sağdaki sabit düğmede duruyor; şeritte ikinci kez gösterilmez.
  const ids = Array.from(new Set([...installed, ...extra])).filter((id) => id !== "store");

  // Alt tutamaç (home indicator) üzerinde sağa/sola kaydırma: açık
  // uygulamalar arasında sırayla geçiş. Simge şeridi yatay kaydırılabilir
  // olduğu için jest oraya bağlanmaz; normal kaydırma bozulmaz.
  const swipe = useSwipeGesture((dir) => {
    const order = [...windows]
      .filter((w) => !w.minimized)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (order.length < 2) return;
    const top = [...windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
    const i = Math.max(0, order.findIndex((w) => w.id === top?.id));
    const step = dir === "left" ? 1 : -1;
    const next = order[(i + step + order.length) % order.length];
    if (next && next.id !== top?.id) focusWindow(next.id);
  });

  return (
    <div
      className="pointer-events-none relative z-[95] flex shrink-0 justify-center px-2 pb-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="tbos-dock pointer-events-auto flex max-w-full items-end gap-1 overflow-x-auto px-2 py-1.5"
        {...swipe}
      >
        {ids.map((id) => {
          const app = catalogApp(id);
          const win = windows.find((w) => w.appId === id);
          const label = app?.label ?? win?.title ?? id;
          return (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => {
                if (!win) return onLaunch(id);
                if (win.minimized) return restoreWindow(win.id);
                // Mobil: önde duran uygulamaya tekrar dokunmak ana ekrana döndürür.
                if (compact) return closeWindow(win.id);
                focusWindow(win.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenu({ x: e.clientX, y: e.clientY - 8, appId: id });
              }}
              className="tbos-dock-item group relative grid shrink-0 place-items-center rounded-xl px-2 py-1.5"
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
        })}

        <span className="mx-1 h-8 w-px shrink-0 bg-[var(--tb-border)]" />

        <button
          type="button"
          onClick={onStore}
          title="Tedbirge Mağaza"
          className="tbos-dock-item grid shrink-0 place-items-center rounded-xl px-2 py-1.5 text-[var(--tb-accent)]"
        >
          <AppIcon id="store" className="h-5 w-5" />
          <span className="mt-0.5 hidden font-osmono text-[10px] sm:block">Mağaza</span>
          <span className="mt-0.5 block h-1 w-1" aria-hidden />
        </button>
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
