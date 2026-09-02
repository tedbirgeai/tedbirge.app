/**
 * MASAÜSTÜ KISAYOLU
 * ------------------------------------------------------------------
 * Izgara akışında duran sabit kısayol: tek tık seçer, çift tık (mobilde
 * tek dokunuş) uygulamayı pencere olarak açar. Serbest sürükleme kaldırıldı;
 * konumlar ızgara tarafından belirlenir, böylece üst üste binme olmaz.
 * ISO 9241 gereği dokunma alanı en az 48×48 px'tir.
 */

import { useCallback, useRef } from "react";

import { AppIcon } from "@/components/shell/app-icons";

export const ICON_W = 92;
export const ICON_H = 96;

export function DesktopIcon({
  id,
  label,
  selected,
  onSelect,
  onOpen,
  onMenu,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onMenu?: (pt: { x: number; y: number }) => void;
}) {
  const lastTap = useRef(0);
  const lastPointer = useRef<string>("mouse");

  const onClick = useCallback(() => {
    onSelect();
    // Dokunmatik/kalem: tek dokunuş doğrudan açar (mobil beklenti).
    if (lastPointer.current !== "mouse") {
      onOpen();
      return;
    }
    // Fare: 400 ms içindeki ikinci tıklama uygulamayı açar (masaüstü mantığı).
    const now = Date.now();
    if (now - lastTap.current < 400) {
      lastTap.current = 0;
      onOpen();
      return;
    }
    lastTap.current = now;
  }, [onOpen, onSelect]);

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        lastPointer.current = e.pointerType;
      }}
      onClick={onClick}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const host = e.currentTarget.closest(".tbos-wallpaper") as HTMLElement | null;
        const r = host?.getBoundingClientRect();
        onMenu?.({ x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) });
      }}
      title={label}
      className={`tbos-desk-icon flex min-h-12 min-w-12 flex-col items-center justify-start gap-1.5 rounded-xl px-2 py-2 text-center select-none ${
        selected ? "tbos-desk-icon--on" : ""
      }`}
      style={{ width: ICON_W }}
    >
      <span className="tbos-desk-glyph grid h-12 w-12 place-items-center rounded-2xl">
        <AppIcon id={id} className="h-6 w-6" />
      </span>
      <span className="max-w-[84px] truncate text-center text-xs font-medium text-[var(--tb-text)] drop-shadow-md">
        {label}
      </span>
    </button>
  );
}
