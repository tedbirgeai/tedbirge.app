/**
 * GÖREV ÇUBUĞU (Taskbar)
 * ------------------------------------------------------------------
 * Solda uygulama başlatıcı düğmesi, sağında açık pencereler listelenir;
 * küçültülmüş pencereler buradan geri gelir.
 */

import { LayoutGrid } from "lucide-react";

import { AppIconSurface } from "@/components/shell/AppIconBadge";
import { focusWindow, restoreWindow, type WindowRecord } from "@/shell/windows";

export function Taskbar({
  windows,
  onLauncher,
  launcherOpen,
}: {
  windows: WindowRecord[];
  onLauncher: () => void;
  launcherOpen: boolean;
}) {
  return (
    <div
      className="tbos-taskbar relative z-[95] flex shrink-0 items-center gap-2 overflow-x-auto px-3 py-2"
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        onClick={onLauncher}
        aria-expanded={launcherOpen}
        className={`wa-press flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 font-osmono text-[12px] transition-colors ${
          launcherOpen ? "tbos-taskbar-button--on" : "tbos-taskbar-button"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
        Uygulamalar
      </button>

      <span className="h-6 w-px shrink-0" style={{ background: "var(--border)" }} />

      {windows.map((w) => (
        <button
          key={w.id}
          type="button"
          onClick={() => (w.minimized ? restoreWindow(w.id) : focusWindow(w.id))}
          className={`wa-press flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 font-osmono text-[12px] transition-colors ${
            w.minimized ? "tbos-taskbar-window--min" : "tbos-taskbar-window"
          }`}
        >
          <AppIconSurface id={w.appId} size="task" />
          <span className="max-w-36 truncate">{w.title}</span>
        </button>
      ))}
    </div>
  );
}
