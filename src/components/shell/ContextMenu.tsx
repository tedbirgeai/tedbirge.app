/**
 * İŞLETİM SİSTEMİ BAĞLAM MENÜSÜ (Context Menu)
 * ------------------------------------------------------------------
 * Tek, yeniden kullanılabilir cam yüzeyli menü: masaüstü, ikon ve Dock
 * aynı bileşeni kullanır. Dışarı tıklama ve Esc menüyü kapatır, menü
 * ekran dışına taşmayacak şekilde konumlandırılır.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem =
  | { kind: "sep" }
  | {
      kind?: "item";
      label: string;
      hint?: string;
      disabled?: boolean;
      danger?: boolean;
      icon?: ReactNode;
      onSelect: () => void;
    };

export function ContextMenu({
  x,
  y,
  items,
  onClose,
  ariaLabel,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    const maxX = (parent?.clientWidth ?? window.innerWidth) - el.offsetWidth - 8;
    const maxY = (parent?.clientHeight ?? window.innerHeight) - el.offsetHeight - 8;
    setPos({ x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) });
  }, [x, y, items.length]);

  useEffect(() => {
    const close = () => onClose();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("blur", close);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={ariaLabel}
      className="tbos-window tbos-ctx pointer-events-auto absolute z-[120] w-60 rounded-xl p-1 shadow-2xl backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it.kind === "sep" ? (
          <span
            key={`sep-${i}`}
            aria-hidden
            className="my-1 block h-px bg-[var(--tb-border)]"
          />
        ) : (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            disabled={it.disabled ?? false}
            onClick={() => {
              onClose();
              it.onSelect();
            }}
            className={`wa-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              it.danger
                ? "text-[var(--tb-danger,#e11d48)] hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]"
                : "text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-accent)_12%,transparent)]"
            }`}
          >
            {it.icon ? <span className="shrink-0 opacity-80">{it.icon}</span> : null}
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            {it.hint ? (
              <span className="shrink-0 font-osmono text-[10px] text-[var(--tb-muted)]">
                {it.hint}
              </span>
            ) : null}
          </button>
        ),
      )}
    </div>
  );
}
