/**
 * DOCK (Görev Çubuğu)
 * ------------------------------------------------------------------
 * Alt kısımda cam yüzeyli şerit: kurulu uygulamalar sabit simge olarak
 * durur, açık pencereler simgenin altında nokta ile işaretlenir.
 * Küçültülmüş pencere kendi simgesine tıklanınca geri gelir.
 */

import { AppIcon } from "@/components/shell/app-icons";
import { catalogApp, useDesktopState } from "@/shell/installed";
import { focusWindow, restoreWindow, type WindowRecord } from "@/shell/windows";

export function Dock({
  windows,
  onLaunch,
  onStore,
}: {
  windows: WindowRecord[];
  onLaunch: (id: string) => void;
  onStore: () => void;
}) {
  const { installed } = useDesktopState();
  const extra = windows.filter((w) => !installed.includes(w.appId)).map((w) => w.appId);
  // Mağaza sağdaki sabit düğmede duruyor; şeritte ikinci kez gösterilmez.
  const ids = Array.from(new Set([...installed, ...extra])).filter((id) => id !== "store");

  return (
    <div className="pointer-events-none relative z-[95] flex shrink-0 justify-center px-2 pb-2">
      <div className="tbos-dock pointer-events-auto flex max-w-full items-end gap-1 overflow-x-auto px-2 py-1.5">
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
                focusWindow(win.id);
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
    </div>
  );
}
