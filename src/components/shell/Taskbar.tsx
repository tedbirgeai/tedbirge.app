/**
 * GÖREV ÇUBUĞU (Taskbar)
 * ------------------------------------------------------------------
 * Solda uygulama başlatıcı düğmesi, sağında açık pencereler listelenir;
 * küçültülmüş pencereler buradan geri gelir.
 */

import { LayoutGrid } from "lucide-react";

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
      className="relative z-[95] flex shrink-0 items-center gap-2 overflow-x-auto px-3 py-2"
      style={{ borderTop: "1px solid var(--border)", background: "var(--tb-panel-solid)" }}
    >
      <button
        type="button"
        onClick={onLauncher}
        aria-expanded={launcherOpen}
        className={`wa-press flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 font-osmono text-[12px] transition-colors ${
          launcherOpen
            ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
            : "border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60"
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
          className={`wa-press shrink-0 rounded-lg border px-3 py-1.5 font-osmono text-[12px] transition-colors ${
            w.minimized
              ? "border-slate-500/25 text-slate-500"
              : "border-emerald-500/30 text-emerald-400"
          }`}
        >
          {w.title}
        </button>
      ))}
    </div>
  );
}
