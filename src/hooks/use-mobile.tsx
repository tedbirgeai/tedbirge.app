import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const DESKTOP_BREAKPOINT = 1200;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * CİHAZ KADEMESİ (üç kademeli yerleşim motoru)
 * ------------------------------------------------------------------
 * mobile  (<768px)        — dokunmatik kart düzeni, sade üst panel
 * tablet  (768–1199px)    — dokunmatik pencereleme, yapışma, daraltılabilir dock
 * desktop (≥1200px)       — sütun hizalamalı akıllı masaüstü ızgarası
 */
export type DeviceTier = "mobile" | "tablet" | "desktop";

function readTier(): DeviceTier {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < MOBILE_BREAKPOINT) return "mobile";
  if (w < DESKTOP_BREAKPOINT) return "tablet";
  return "desktop";
}

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = React.useState<DeviceTier>("desktop");

  React.useEffect(() => {
    const onResize = () => setTier(readTier());
    onResize();
    window.addEventListener("resize", onResize);
    const mqlA = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlB = window.matchMedia(`(max-width: ${DESKTOP_BREAKPOINT - 1}px)`);
    mqlA.addEventListener("change", onResize);
    mqlB.addEventListener("change", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      mqlA.removeEventListener("change", onResize);
      mqlB.removeEventListener("change", onResize);
    };
  }, []);

  return tier;
}

/**
 * "Dar" yerleşim yalnız gerçek telefon genişliğinde (<768px) devreye girer.
 * Tabletler artık tam ekran karta zorlanmaz; pencere yöneticisi çalışır.
 */
export function useIsCompact(breakpoint = MOBILE_BREAKPOINT) {
  const [compact, setCompact] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = () => setCompact(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return compact;
}
