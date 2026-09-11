/**
 * DESTEKLENMEYEN DOSYA KARTI
 * ------------------------------------------------------------------
 * VFS içindeki bir dosyanın türü hiçbir yerleşik uygulamayla eşleşmediğinde
 * sessiz kalmak yerine dürüst bir kart gösterir: dosya bilgisi, metin olarak
 * açma denemesi ve dışa aktarma seçeneği. Renkler yalnız --tb-* değişkenleri.
 */

import { useEffect, useState } from "react";
import { FileQuestion, Download, FileText, X } from "lucide-react";

import { readFile, type VfsEntry } from "@/lib/vfs/store";

const btn =
  "wa-press inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--tb-border)] px-3 text-[12px] text-[var(--tb-text)]";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function UnsupportedFileCard({
  entry,
  onClose,
}: {
  entry: VfsEntry;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const openAsText = async () => {
    setBusy(true);
    try {
      const file = await readFile(entry.id);
      setPreview(file ? (await file.text()).slice(0, 4000) : "Dosya okunamadı.");
    } catch {
      setPreview("Dosya okunamadı.");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setBusy(true);
    try {
      const file = await readFile(entry.id);
      if (!file) return;
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = entry.name;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] grid place-items-center bg-[color-mix(in_srgb,var(--tb-bg)_70%,transparent)] p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bu dosyayı açacak uygulama yok"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <FileQuestion className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tb-accent)]" aria-hidden />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[var(--tb-text)]">
              Bu dosyayı açacak uygulama yok
            </h2>
            <p className="mt-1 font-osmono text-[11px] break-all text-[var(--tb-muted)]">
              {entry.name} · {entry.mime || "bilinmeyen tür"} · {formatBytes(entry.size ?? 0)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            className="wa-press grid h-8 w-8 place-items-center rounded-full text-[var(--tb-muted)]"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {preview != null ? (
          <pre className="mt-3 max-h-56 overflow-auto rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg)] p-2 font-osmono text-[11px] whitespace-pre-wrap text-[var(--tb-text)]">
            {preview}
          </pre>
        ) : (
          <p className="mt-3 text-[13px] text-[var(--tb-muted)]">
            Dosya güvenle saklanıyor. İçeriğini metin olarak görüntüleyebilir veya cihazınıza
            aktarabilirsiniz.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={busy} onClick={() => void openAsText()}>
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Metin olarak aç
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => void download()}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            Dışa aktar
          </button>
        </div>
      </div>
    </div>
  );
}
