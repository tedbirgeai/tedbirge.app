/**
 * PORTAL ORTAK ARAYÜZ PARÇALARI
 * ------------------------------------------------------------------
 * Kristal (cam) yüzeyler, ölçüm kartı, rozet, iskelet, boş durum ve
 * erişilebilir pencere. Renkler yalnız --tb-* değişkenlerinden okunur.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

export function GlassCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--tb-border)] bg-[color-mix(in_srgb,var(--tb-panel-solid)_78%,transparent)] p-4 shadow-lg shadow-[color-mix(in_srgb,var(--tb-text)_8%,transparent)] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <GlassCard className="min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="font-osmono text-[11px] uppercase tracking-[0.14em] text-[var(--tb-muted)]">
          {label}
        </span>
        {icon ? <span className="shrink-0 text-[var(--tb-accent)]">{icon}</span> : null}
      </div>
      <p className="mt-2 flex items-baseline gap-1 tabular-nums">
        <span className="text-[26px] font-semibold leading-none text-[var(--tb-text)]">
          {value}
        </span>
        {unit ? <span className="text-[13px] text-[var(--tb-muted)]">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 truncate text-[12px] text-[var(--tb-muted)]">{hint}</p> : null}
    </GlassCard>
  );
}

export function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  const color =
    tone === "ok"
      ? "var(--tb-accent)"
      : tone === "warn"
        ? "var(--tb-warning, #b45309)"
        : tone === "bad"
          ? "var(--tb-danger, #dc2626)"
          : "var(--tb-muted)";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-osmono text-[11px]"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-11 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--tb-text)_7%,transparent)]"
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--tb-border)] px-6 py-12 text-center">
      {icon ? <span className="text-[var(--tb-accent)]">{icon}</span> : null}
      <h3 className="text-[15px] font-semibold text-[var(--tb-text)]">{title}</h3>
      <p className="max-w-sm text-[13px] text-[var(--tb-muted)]">{description}</p>
      {action}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !ref.current) return;
      const items = ref.current.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const timer = window.setTimeout(() => {
      ref.current?.querySelector<HTMLElement>("input, select, button")?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center bg-[color-mix(in_srgb,var(--tb-text)_28%,transparent)] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[var(--tb-text)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Pencereyi kapat"
                className="grid h-9 w-9 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export const inputClass =
  "mt-1 min-h-11 w-full rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] px-3 text-[13px] text-[var(--tb-text)] outline-none focus:border-[var(--tb-accent)]";

export const labelClass =
  "block font-osmono text-[11px] uppercase tracking-[0.14em] text-[var(--tb-muted)]";

export const primaryBtn =
  "min-h-11 rounded-xl bg-[var(--tb-accent)] px-4 font-osmono text-[12px] uppercase tracking-[0.14em] text-[var(--tb-bg)] disabled:opacity-50";

export const ghostBtn =
  "min-h-11 rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] uppercase tracking-[0.14em] text-[var(--tb-text)]";
