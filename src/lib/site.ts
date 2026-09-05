const ENV_SITE_URL =
  typeof import.meta.env !== "undefined"
    ? (import.meta.env["VITE_SITE_URL"] as string | undefined)
    : undefined;

/** Yayın alan adı. Üretim alan adı bağlandığında VITE_SITE_URL ile geçilir. */
export const SITE_URL = (ENV_SITE_URL || "https://tedbirge.app").replace(/\/$/, "");

/** Marka adı — og:site_name ve başlıklarda kullanılır. */
export const SITE_NAME = "Tedbirge® WebOS";

/** Geliştirici portalı / SDK dokümantasyonu (harici). */
export const DEV_PORTAL_URL = "https://tedbirge.dev";

export function siteUrl(path = "/") {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
