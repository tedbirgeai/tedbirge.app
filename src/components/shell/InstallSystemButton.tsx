/**
 * "SİSTEMİ CİHAZA KUR" DÜĞMESİ
 * ------------------------------------------------------------------
 * Tedbirge® WebOS'i telefon, tablet ve bilgisayara bir uygulama gibi
 * kurar. Tarayıcı kurulum penceresini desteklemiyorsa (iOS Safari)
 * adım adım yönerge gösterilir. Kuruluysa yalnız rozet görünür.
 */

import { useCallback, useState } from "react";
import { CheckCircle2, Download, Share, X } from "lucide-react";

import { isPublishedOrigin, isStandaloneDisplay, promptInstall, useInstallState } from "@/lib/pwa-install";

export function InstallSystemButton({ compact = false }: { compact?: boolean }) {
  const { installed, ios } = useInstallState();
  const [help, setHelp] = useState(false);

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") setHelp(true);
  }, []);

  if (installed || isStandaloneDisplay()) {
    return (
      <span
        className="hidden items-center gap-1 font-osmono text-[11px] text-[var(--tb-accent)] sm:inline-flex"
        title="Tedbirge WebOS bu cihaza kurulu"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Cihaza kurulu
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        title="Sistemi cihaza kur"
        aria-label="Sistemi cihaza kur"
        className={
          compact
            ? "tbos-winbtn wa-press grid h-7 w-7 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-accent)]"
            : "tbos-winbtn wa-press inline-flex items-center gap-1.5 rounded-full border border-[var(--tb-accent)]/40 px-2.5 py-1 font-osmono text-[11px] text-[var(--tb-accent)]"
        }
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        {!compact && <span>Sistemi cihaza kur</span>}
      </button>

      {help && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[var(--tb-surface,#fff)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-[var(--tb-text)]">Sistemi cihaza kurun</h2>
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="wa-press rounded-full p-1 text-[var(--tb-muted)]"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ol className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-[var(--tb-muted)]">
              {ios ? (
                <>
                  <li>
                    1. Alt çubuktaki <Share className="inline h-3.5 w-3.5" aria-hidden /> Paylaş
                    düğmesine dokunun.
                  </li>
                  <li>2. “Ana Ekrana Ekle” seçeneğini seçin.</li>
                  <li>3. “Ekle” deyin — Tedbirge WebOS tam ekran açılır.</li>
                </>
              ) : (
                <>
                  {!isPublishedOrigin() && (
                    <li>Önce yayınlanmış Tedbirge adresini yeni sekmede açın.</li>
                  )}
                  <li>1. Tarayıcı menüsünü (⋮ veya …) açın.</li>
                  <li>2. “Uygulamayı yükle” / “Ana ekrana ekle” seçeneğine dokunun.</li>
                  <li>3. Onaylayın — simge masaüstüne/ana ekrana eklenir.</li>
                </>
              )}
            </ol>
            <p className="mt-3 text-[12px] text-[var(--tb-muted)]">
              Kurulum ücretsizdir; sistem çevrimdışıyken de açılır.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
