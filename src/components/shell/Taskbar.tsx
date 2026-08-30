/**
 * GÖREV ÇUBUĞU (Taskbar)
 * ------------------------------------------------------------------
 * Açık pencereleri listeler; küçültülmüş pencereler buradan geri gelir.
 * Masaüstünde pencere yöneticisiyle birlikte çalışır.
 */

import { focusWindow, restoreWindow, type WindowRecord } from "@/shell/windows";

export function Taskbar({ windows }: { windows: WindowRecord[] }) {
  if (windows.length === 0) return null;
  return (
    <div
      className="flex shrink-0 items-center gap-2 overflow-x-auto px-3 py-2"
      style={{ borderTop: "1px solid var(--border)", background: "rgba(11,16,29,0.9)" }}
    >
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
