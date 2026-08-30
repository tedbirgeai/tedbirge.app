/**
 * MASAÜSTÜ YAŞAM KARTLARI
 * ------------------------------------------------------------------
 * Masaüstünün sağ üst köşesinde duran üç canlı kart: mesh ağ sağlığı,
 * yerel depolama kullanımı ve odak modu. Tümü cihaz verisiyle çalışır,
 * internet gerektirmez. Kartlar gizlenebilir.
 */

import { useEffect, useState } from "react";
import { ChevronRight, Focus, HardDrive, Radio } from "lucide-react";

import { useFocusMode, setFocusMode } from "@/lib/shell/focus-mode";
import { useNetworkMode, NETWORK_MODES } from "@/lib/shell/network-mode";
import { notifyOk } from "@/lib/shell/notify";
import { onVfsChange, storageUsage, type StorageUsage } from "@/lib/vfs/store";
import { useShell } from "@/shell/ShellProvider";

function human(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function DesktopWidgets({ onOpen }: { onOpen: (id: string) => void }) {
  const { node } = useShell();
  const mode = useNetworkMode();
  const focus = useFocusMode();
  const [usage, setUsage] = useState<StorageUsage>({ files: 0, bytes: 0, quota: null });

  useEffect(() => {
    const read = () => {
      void storageUsage().then(setUsage);
    };
    read();
    const off = onVfsChange(read);
    const t = window.setInterval(read, 30000);
    return () => {
      off();
      window.clearInterval(t);
    };
  }, []);

  const direct = node.peers.filter((p) => p.direct).length;
  const modeLabel = NETWORK_MODES.find((m) => m.id === mode)?.label ?? "Küresel İnternet";
  const ratio = usage.quota ? Math.min(1, usage.bytes / usage.quota) : 0;

  return (
    <aside
      aria-label="Masaüstü kartları"
      data-focus-hide="true"
      className="pointer-events-none absolute top-4 right-4 z-[5] hidden w-64 flex-col gap-2.5 md:flex"
    >
      <button
        type="button"
        onClick={() => onOpen("mesh")}
        className="tbos-window pointer-events-auto wa-press rounded-2xl p-3 text-left"
      >
        <span className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
          <span className="flex-1 font-osmono text-[11px] text-[var(--tb-muted)]">Mesh Ağ</span>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--tb-muted)]" aria-hidden />
        </span>
        <span className="mt-1 block text-[20px] leading-tight font-semibold text-[var(--tb-text)]">
          {direct} cihaz
        </span>
        <span className="block font-osmono text-[10.5px] text-[var(--tb-muted)]">
          {modeLabel} · {node.running ? "düğüm çalışıyor" : "düğüm durdu"}
          {node.rttMs != null ? ` · ${node.rttMs} ms` : ""}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpen("files")}
        className="tbos-window pointer-events-auto wa-press rounded-2xl p-3 text-left"
      >
        <span className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
          <span className="flex-1 font-osmono text-[11px] text-[var(--tb-muted)]">
            Yerel Depolama
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--tb-muted)]" aria-hidden />
        </span>
        <span className="mt-1 block text-[20px] leading-tight font-semibold text-[var(--tb-text)]">
          {human(usage.bytes)}
        </span>
        <span
          className="mt-1.5 block h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--tb-border)" }}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.max(2, ratio * 100)}%`, background: "var(--tb-accent)" }}
          />
        </span>
        <span className="mt-1 block font-osmono text-[10.5px] text-[var(--tb-muted)]">
          {usage.files} dosya{usage.quota ? ` · ${human(usage.quota)} ayrıldı` : ""}
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          setFocusMode(!focus);
          notifyOk(focus ? "Odak modu kapandı" : "Odak modu açık", "Bildirimler ve kartlar sadeleşir.");
        }}
        aria-pressed={focus}
        className={`tbos-window pointer-events-auto wa-press flex items-center gap-2 rounded-2xl p-3 text-left ${
          focus ? "border border-[var(--tb-accent)]" : ""
        }`}
      >
        <Focus
          className={`h-4 w-4 ${focus ? "text-[var(--tb-accent)]" : "text-[var(--tb-muted)]"}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] text-[var(--tb-text)]">
            {focus ? "Odak modu açık" : "Hızlı odaklanma"}
          </span>
          <span className="block font-osmono text-[10.5px] text-[var(--tb-muted)]">
            {focus ? "Bildirimler susturuldu" : "Tek tıkla sadeleştir"}
          </span>
        </span>
      </button>
    </aside>
  );
}
