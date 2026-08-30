/**
 * BİLGİSAYARIM
 * ------------------------------------------------------------------
 * Bu cihazın kimliği, ağ durumu ve kurulu uygulama sayısı; sistem
 * sayfasına ve mesh durumuna hızlı geçiş.
 */

import { Link } from "@tanstack/react-router";

import { describeNode } from "@/lib/node-runtime";
import { useShell } from "@/shell/ShellProvider";
import { useDesktopState } from "@/shell/installed";

export function ComputerApp({ onMesh }: { onMesh: () => void }) {
  const { node } = useShell();
  const status = describeNode(node);
  const { installed } = useDesktopState();

  const rows: Array<[string, string]> = [
    ["Ağ durumu", status.text],
    ["Bağlı cihaz", String(status.directPeers)],
    ["Bekleyen aktarım", String(status.queued)],
    ["Kurulu uygulama", String(installed.length)],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-4">
        <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">Bu cihaz</h3>
        <dl className="mt-3 grid gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-3">
              <dt className="font-osmono text-[12px] text-[var(--tb-muted)]">{k}</dt>
              <dd className="truncate text-[13px] font-medium text-[var(--tb-text)]">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMesh}
          className="wa-press rounded-lg border border-[var(--tb-accent)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
        >
          Ağ durumu
        </button>
        <Link
          to="/system"
          className="wa-press rounded-lg border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-muted)]"
        >
          Sistem ayarları
        </Link>
      </div>
    </div>
  );
}
