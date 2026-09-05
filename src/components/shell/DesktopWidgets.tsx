/**
 * MASAÜSTÜ YAŞAM KARTLARI
 * ------------------------------------------------------------------
 * Masaüstünün sağ üst köşesinde duran üç canlı kart: mesh ağ sağlığı,
 * yerel depolama kullanımı ve odak modu. Tümü cihaz verisiyle çalışır,
 * internet gerektirmez. Kartlar gizlenebilir.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronRight, Focus, GripVertical, HardDrive, Radio, X } from "lucide-react";

import { useFocusMode, setFocusMode } from "@/lib/shell/focus-mode";
import { useNetworkMode, NETWORK_MODES } from "@/lib/shell/network-mode";
import { notifyOk } from "@/lib/shell/notify";
import { useTick } from "@/lib/shell/telemetry-store";
import { onVfsChange, storageUsage, type StorageUsage } from "@/lib/vfs/store";
import { useShell } from "@/shell/shell-context";

const POS_KEY = "tedbirge:widgets:pos";
const HIDE_KEY = "tedbirge:widgets:hidden";

function human(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function readPos(): { x: number; y: number } | null {
  try {
    const raw = window.localStorage.getItem(POS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { x: number; y: number };
    return typeof p?.x === "number" && typeof p?.y === "number" ? p : null;
  } catch {
    return null;
  }
}

export function DesktopWidgets({ onOpen }: { onOpen: (id: string) => void }) {
  const { node } = useShell();
  const mode = useNetworkMode();
  const focus = useFocusMode();
  const [usage, setUsage] = useState<StorageUsage>({ files: 0, bytes: 0, quota: null });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hidden, setHidden] = useState(false);
  const drag = useRef<{
    dx: number;
    dy: number;
    w: number;
    h: number;
    x: number;
    y: number;
    raf: number;
  } | null>(null);

  const box = useRef<HTMLElement>(null);
  const tick = useTick(30);

  useEffect(() => {
    setPos(readPos());
    setHidden(window.localStorage.getItem(HIDE_KEY) === "1");
    const show = () => setHidden(false);
    window.addEventListener("tedbirge:widgets-show", show);
    return () => window.removeEventListener("tedbirge:widgets-show", show);
  }, []);

  useEffect(() => {
    const read = () => {
      void storageUsage().then(setUsage);
    };
    read();
    const off = onVfsChange(read);
    return off;
    // Paylaşımlı 30 sn tetikleyicisi ayrı zamanlayıcı ihtiyacını kaldırır.
  }, [tick]);

  const direct = node.peers.filter((p) => p.direct).length;
  const modeLabel = NETWORK_MODES.find((m) => m.id === mode)?.label ?? "Küresel İnternet";
  const ratio = usage.quota ? Math.min(1, usage.bytes / usage.quota) : 0;

  const onPointerDown = (e: React.PointerEvent) => {
    const el = box.current;
    const rect = el?.getBoundingClientRect();
    if (!el || !rect) return;
    // Ölçüler bir kez okunur; sürükleme boyunca düzen okuması yapılmaz.
    drag.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
      x: rect.left,
      y: rect.top,
      raf: 0,
    };
    el.style.willChange = "left, top";
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    d.x = Math.min(Math.max(4, e.clientX - d.dx), window.innerWidth - d.w - 4);
    d.y = Math.min(Math.max(32, e.clientY - d.dy), window.innerHeight - d.h - 4);
    if (d.raf) return;
    d.raf = requestAnimationFrame(() => {
      d.raf = 0;
      const el = box.current;
      if (!el) return;
      el.style.left = `${d.x}px`;
      el.style.top = `${d.y}px`;
      el.style.right = "auto";
    });
  };

  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    if (d.raf) cancelAnimationFrame(d.raf);
    drag.current = null;
    const el = box.current;
    if (el) el.style.willChange = "";
    const next = { x: d.x, y: d.y };
    setPos(next);
    window.localStorage.setItem(POS_KEY, JSON.stringify(next));
  };

  const hide = () => {
    setHidden(true);
    window.localStorage.setItem(HIDE_KEY, "1");
    notifyOk("Kartlar gizlendi", "Masaüstü sağ tık menüsünden geri getirebilirsiniz.");
  };

  if (hidden) return null;

  return (
    <aside
      ref={box}
      aria-label="Masaüstü kartları"
      data-focus-hide="true"
      style={pos ? { top: pos.y, left: pos.x, right: "auto" } : undefined}
      className="pointer-events-none absolute top-4 right-4 z-[5] hidden w-64 flex-col gap-2.5 md:flex"
    >
      <div className="pointer-events-auto flex items-center gap-1 self-end">
        <button
          type="button"
          aria-label="Kartları taşı"
          title="Kartları taşı"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="grid h-6 w-6 cursor-grab place-items-center rounded-md text-[var(--tb-muted)] active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Kartları gizle"
          title="Kartları gizle"
          onClick={hide}
          className="wa-press grid h-6 w-6 place-items-center rounded-md text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

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
          notifyOk(
            focus ? "Odak modu kapandı" : "Odak modu açık",
            "Bildirimler ve kartlar sadeleşir.",
          );
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
