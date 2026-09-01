/**
 * OS BAĞLANTISI (OsLink)
 * ------------------------------------------------------------------
 * Tedbirge WebOS tek kabuktur: eski site rotaları artık URL değiştirmez,
 * ilgili sistem uygulamasını pencere olarak açar. Bu bileşen eski
 * `<Link to="/...">` çağrılarının yerine geçer; yasal URL'ler (ör.
 * /gizlilik) gerçek bağlantı olarak korunur.
 */

import type { ReactNode, MouseEvent } from "react";

import { closeAllWindows, openWindow } from "@/shell/windows";
import { catalogApp } from "@/shell/installed";

/** Yasal zorunluluk nedeniyle gerçek URL olarak kalan sayfalar. */
const LEGAL_PATHS = new Set(["/gizlilik", "/kosullar", "/iade", "/yasal", "/ihracat-uyum"]);

/** Eski rota → sistem uygulaması eşlemesi. */
const APP_FOR_PATH: Record<string, string> = {
  "/panel": "panel",
  "/yonetim": "panel",
  "/saha-raporu": "panel",
  "/saha": "panel",
  "/pilot-panosu": "panel",
  "/kapsama": "panel",
  "/dashboard": "panel",
  "/teklif": "panel",
  "/dokumanlar": "sysinfo",
  "/api-dokumantasyon": "sysinfo",
  "/kurumsal": "sysinfo",
  "/hakkimizda": "sysinfo",
  "/iletisim": "sysinfo",
  "/mevzuat": "sysinfo",
  "/turkiye-mevzuat": "sysinfo",
  "/uyumluluk": "sysinfo",
  "/sertifikasyon": "sysinfo",
  "/tasiyicilar": "sysinfo",
  "/protokol": "sysinfo",
  "/enerji": "sysinfo",
  "/urun": "sysinfo",
  "/karsilastirma": "sysinfo",
  "/hibrit-model": "sysinfo",
  "/afet-kamu": "sysinfo",
  "/rehber": "sysinfo",
  "/katil": "sysinfo",
  "/kur": "sysinfo",
  "/demo": "sysinfo",
  "/guvenlik": "settings",
  "/izinler": "settings",
  "/giris": "settings",
  "/kayit": "settings",
  "/fiyatlandirma": "store",
  "/system": "computer",
  "/app": "computer",
};

const TITLES: Record<string, string> = {
  panel: "Panel",
  sysinfo: "Sistem Bilgisi",
  settings: "Ayarlar",
  store: "Tedbirge Mağaza",
};

/** Verilen yolu sistem penceresi olarak açar; eşleşme yoksa ana ekrana döner. */
export function openPath(to: string) {
  const base = `/${to.split("/").filter(Boolean)[0] ?? ""}`;
  if (to === "/" || base === "/") {
    closeAllWindows();
    return;
  }
  const appId = APP_FOR_PATH[to] ?? APP_FOR_PATH[base];
  if (!appId) {
    closeAllWindows();
    return;
  }
  openWindow(appId, catalogApp(appId)?.label ?? TITLES[appId] ?? appId);
}

export function OsLink({
  to,
  className,
  children,
  onClick,
  title,
  ...rest
}: {
  to: string;
  className?: string;
  children?: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  title?: string;
  /** Eski çağrılardaki yönlendirici propları sessizce yutulur. */
  params?: unknown;
  search?: unknown;
  replace?: boolean;
  activeProps?: unknown;
  target?: string;
  rel?: string;
}) {
  if (LEGAL_PATHS.has(to)) {
    return (
      <a href={to} className={className} title={title} {...(rest.target ? { target: rest.target } : {})}>
        {children}
      </a>
    );
  }
  return (
    <a
      href="#"
      className={className}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
        openPath(to);
      }}
    >
      {children}
    </a>
  );
}

export { OsLink as Link };
