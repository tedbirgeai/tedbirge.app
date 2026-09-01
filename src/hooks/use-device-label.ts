import { useEffect, useState } from "react";

import { deviceScopeLabel } from "@/lib/identity/device";

/**
 * "Bilgisayarım" / "Tabletim" / "Cihazım" — cihaz türüne ve ekran
 * genişliğine göre güncellenen başlık. Döndürme ve pencere boyutu
 * değişiminde yeniden hesaplanır.
 */
export function useDeviceScopeLabel(): string {
  const [label, setLabel] = useState(() => deviceScopeLabel());

  useEffect(() => {
    const onResize = () => setLabel(deviceScopeLabel());
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return label;
}
