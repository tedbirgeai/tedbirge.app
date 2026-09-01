/**
 * "SİSTEMİ CİHAZA KUR" DÜĞMESİ
 * ------------------------------------------------------------------
 * Tek tıkla doğrudan aksiyon: tarayıcı yerel kurulum penceresini
 * destekliyorsa o açılır, desteklemiyorsa hiçbir talimat baloncuğu
 * gösterilmeden bare-metal imaj indirmesi başlatılır.
 */

import { useCallback } from "react";
import { CheckCircle2, Download } from "lucide-react";

import { startIsoDownload } from "@/components/shell/BareMetalIso";
import { isStandaloneDisplay, promptInstall, useInstallState } from "@/lib/pwa-install";

export function InstallSystemButton({ compact = false }: { compact?: boolean }) {
  const { installed } = useInstallState();

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") startIsoDownload();
  }, []);

  if (installed || isStandaloneDisplay()) {
    return (
      <span
        className="hidden shrink-0 items-center gap-1 font-osmono text-[11px] text-[var(--tb-accent)] sm:inline-flex"
        title="Tedbirge WebOS bu cihaza kurulu"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Cihaza kurulu
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void install()}
      title="Sistemi cihaza kur"
      aria-label="Sistemi cihaza kur"
      className={
        compact
          ? "tbos-winbtn wa-press grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--tb-muted)] hover:text-[var(--tb-accent)] sm:h-7 sm:w-7"
          : "tbos-winbtn wa-press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--tb-accent)]/40 px-2.5 py-1 font-osmono text-[11px] text-[var(--tb-accent)]"
      }
    >
      <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
      {!compact && <span className="hidden md:inline">Sistemi cihaza kur</span>}
    </button>
  );
}
