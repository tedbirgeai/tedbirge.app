/**
 * İŞLETİM SİSTEMİ BAĞLAM MENÜSÜ (Context Menu)
 * ------------------------------------------------------------------
 * Tek, yeniden kullanılabilir cam yüzeyli menü: masaüstü, ikon, dosya
 * ve Dock aynı bileşeni kullanır. Alt menü (submenu) desteklidir.
 * Dışarı tıklama ve Esc menüyü kapatır, menü ekran dışına taşmaz.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export type MenuItem =
  | { kind: "sep" }
  | {
      kind?: "item";
      label: string;
      hint?: string;
      disabled?: boolean;
      danger?: boolean;
      icon?: ReactNode;
      /** Alt menü öğeleri; verilirse tıklama yerine açılır liste gelir. */
      children?: MenuItem[];
      onSelect?: () => void;
    };

function Panel({
  items,
  onClose,
  ariaLabel,
  level = 0,
}: {
  items: MenuItem[];
  onClose: () => void;
  ariaLabel: string;
  level?: number;
}) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div role="menu" aria-label={ariaLabel} className="relative w-full">
      {items.map((it, i) =>
        it.kind === "sep" ? (
          <span key={`sep-${i}`} aria-hidden className="my-1 block h-px bg-[var(--tb-border)]" />
        ) : (
          <div key={it.label} className="relative">
            <button
              type="button"
              role="menuitem"
              aria-haspopup={it.children ? "menu" : undefined}
              aria-expanded={it.children ? open === it.label : undefined}
              disabled={it.disabled ?? false}
              onPointerEnter={() => setOpen(it.children ? it.label : null)}
              onClick={() => {
                if (it.children) {
                  setOpen((o) => (o === it.label ? null : it.label));
                  return;
                }
                onClose();
                it.onSelect?.();
              }}
              className={`wa-press flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                it.danger
                  ? "text-[var(--tb-danger,#e11d48)] hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]"
                  : "text-[var(--tb-text)] hover:bg-[color-mix(in_srgb,var(--tb-accent)_12%,transparent)]"
              }`}
            >
              {it.icon ? <span className="shrink-0 opacity-80">{it.icon}</span> : null}
              <span className="min-w-0 flex-1 truncate">{it.label}</span>
              {it.children ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              ) : it.hint ? (
                <span className="shrink-0 font-osmono text-[10px] text-[var(--tb-muted)]">
                  {it.hint}
                </span>
              ) : null}
            </button>

            {it.children && open === it.label ? (
              <div
                className="tbos-window tbos-ctx absolute top-0 z-10 w-56 rounded-xl p-1 shadow-2xl backdrop-blur-xl"
                style={{ left: level % 2 === 0 ? "100%" : undefined, right: level % 2 ? "100%" : undefined }}
              >
                <Panel
                  items={it.children}
                  onClose={onClose}
                  ariaLabel={`${it.label} alt menüsü`}
                  level={level + 1}
                />
              </div>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
}

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
      className="tbos-window tbos-ctx pointer-events-auto absolute z-[120] w-60 rounded-xl p-1 shadow-2xl backdrop-blur-xl"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Panel items={items} onClose={onClose} ariaLabel={ariaLabel} />
    </div>
  );
}
