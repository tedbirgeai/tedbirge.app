import { useCallback } from "react";
import { Download } from "lucide-react";

import { startIsoDownload } from "@/components/shell/BareMetalIso";
import { promptInstall, useInstallState } from "@/lib/pwa-install";

/**
 * Pazarlama sayfalarındaki "Uygulamayı Yükle" düğmesi.
 * Tek tıkla yerel kurulum penceresi açılır; tarayıcı desteklemiyorsa
 * hiçbir talimat katmanı gösterilmeden imaj indirmesi başlar.
 */
export function InstallAppCta({
  variant = "primary",
  label = "Uygulamayı Yükle",
  className = "",
}: {
  variant?: "primary" | "outline" | "nav";
  label?: string;
  className?: string;
}) {
  const { installed } = useInstallState();

  const onClick = useCallback(async () => {
    const result = await promptInstall();
    if (result === "unavailable") startIsoDownload();
  }, []);

  const base =
    "inline-flex shrink-0 items-center gap-2 rounded-sm font-mono text-xs font-semibold uppercase tracking-[0.15em] transition-opacity";
  const styles =
    variant === "primary"
      ? "bg-primary px-6 py-3 text-primary-foreground hover:opacity-90"
      : variant === "nav"
        ? "border border-border px-4 py-2 text-foreground transition-colors hover:bg-secondary"
        : "border border-border px-6 py-3 text-foreground transition-colors hover:bg-secondary";

  if (installed) return null;

  return (
    <button type="button" onClick={() => void onClick()} className={`${base} ${styles} ${className}`}>
      <Download className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
