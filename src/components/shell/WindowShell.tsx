/**
 * TEK TİP PENCERE KABUĞU
 * ------------------------------------------------------------------
 * Tüm yerleşik uygulamalar (Dosyalar, Sohbet, Medya, Görünüm, Mağaza,
 * Aktarım, Bilgisayarım) aynı iç düzeni kullanır: isteğe bağlı başlık,
 * araç şeridi, kaydırılabilir gövde ve ortak boş durum kartı. Renkler
 * yalnızca `--tb-*` değişkenlerinden okunur.
 */

import type { ReactNode } from "react";

export function WindowShell({
  title,
  subtitle,
  toolbar,
  children,
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--tb-panel-solid)]">
      {title || toolbar ? (
        <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--tb-border)] px-4 py-2">
          <div className="min-w-0">
            {title ? (
              <h2 className="truncate text-[14px] font-semibold text-[var(--tb-text)]">{title}</h2>
            ) : null}
            {subtitle ? (
              <p className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">{subtitle}</p>
            ) : null}
          </div>
          {toolbar ? <div className="flex shrink-0 items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}
      <div className={`min-h-0 flex-1 overflow-y-auto ${padded ? "p-4" : ""}`}>{children}</div>
    </div>
  );
}

/** Ortak boş durum kartı. */
export function WindowEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-[var(--tb-border)] p-8 text-center">
      <div>
        <p className="text-[13px] font-medium text-[var(--tb-text)]">{title}</p>
        {hint ? <p className="mt-1 text-[12px] text-[var(--tb-muted)]">{hint}</p> : null}
      </div>
    </div>
  );
}
