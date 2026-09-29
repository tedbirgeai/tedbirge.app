import type { HTMLAttributes, ReactNode } from "react";

import { useDeviceTier } from "@/hooks/use-mobile";

/**
 * MASAÜSTÜ IZGARA MOTORU (üç kademeli)
 * ------------------------------------------------------------------
 * Mobil: geniş dokunma hedefli üç sütun kart akışı.
 * Tablet: daha sık sütunlu akış, daraltılabilir dock ile uyumlu boşluk.
 * Masaüstü/ultra-wide: Windows/macOS gibi SÜTUN yönünde (dikey) dizilim —
 * simgeler soldan sağa değil, yukarıdan aşağı dolar.
 */
export function DesktopGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  const tier = useDeviceTier();

  const layout =
    tier === "desktop"
      ? "grid-flow-col auto-cols-[104px] grid-rows-[repeat(auto-fill,108px)] content-start gap-x-2 gap-y-1 p-6 overflow-x-auto"
      : tier === "tablet"
        ? "grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-3 gap-y-6 p-5 overflow-y-auto"
        : "grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-x-2 gap-y-5 p-4 overflow-y-auto";

  return (
    <div
      {...props}
      data-tier={tier}
      className={`tbos-desktop-grid grid h-full max-h-full w-full items-start justify-start ${layout} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
