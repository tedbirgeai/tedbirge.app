/**
 * İKİ AŞAMALI ONAY (Nielsen #5 — Hata Önleme)
 * ------------------------------------------------------------------
 * Yıkıcı işlemler (dosya silme, bağlantı koparma, abonelik iptali)
 * önce açık dille anlatılır, sonra ayrı bir onay düğmesiyle çalışır.
 * Onay düğmesi kısa bir süre pasif kalır; refleks tıklaması engellenir.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { announce } from "@/lib/shell/announce";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Evet, devam et",
  cancelLabel = "Vazgeç",
  holdMs = 2000,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Onay düğmesinin pasif kalacağı süre (ms). */
  holdMs?: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(Math.ceil(holdMs / 1000));
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    announce(`${title}. ${description}`);
    setLeft(Math.ceil(holdMs / 1000));
    cancelRef.current?.focus();
    const timer = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, holdMs, title, description, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/45 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel)] p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tb-accent)]" aria-hidden />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--tb-text)]">{title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-[var(--tb-muted)]">{description}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="wa-press min-h-12 rounded-xl border border-[var(--tb-border)] px-4 text-sm text-[var(--tb-text)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={left > 0}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="wa-press min-h-12 rounded-xl bg-[var(--tb-accent)] px-4 text-sm font-medium text-[var(--tb-bg)] disabled:opacity-50"
          >
            {left > 0 ? `${confirmLabel} (${left})` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
