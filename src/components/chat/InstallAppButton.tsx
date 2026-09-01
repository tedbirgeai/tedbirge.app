import { useCallback } from "react";
import { Download } from "lucide-react";

import { startIsoDownload } from "@/components/shell/BareMetalIso";
import { promptInstall, useInstallState } from "@/lib/pwa-install";

/**
 * "Uygulamayı yükle" düğmesi — tek tıkla yerel kurulum penceresini açar.
 * Tarayıcı kurulum penceresini desteklemiyorsa hiçbir talimat baloncuğu
 * gösterilmeden doğrudan imaj indirmesi başlatılır.
 */
export function InstallAppButton({ compact = false }: { compact?: boolean }) {
  const { installed } = useInstallState();

  const install = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") startIsoDownload();
  }, []);

  if (installed) return null;

  return (
    <button
      type="button"
      onClick={() => void install()}
      className={
        compact
          ? "wa-press shrink-0 rounded-full p-2 hover:bg-black/5"
          : "wa-press flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-white"
      }
      style={compact ? { color: "var(--wa-muted)" } : { background: "var(--wa-accent)" }}
      title="Uygulamayı yükle"
      aria-label="Uygulamayı yükle"
    >
      <Download className="h-[18px] w-[18px]" aria-hidden />
      {!compact && <span>Uygulamayı yükle</span>}
    </button>
  );
}
