const ENV_SITE_URL =
  typeof import.meta.env !== "undefined"
    ? (import.meta.env["VITE_SITE_URL"] as string | undefined)
    : undefined;

/** Yayın alan adı. Üretim alan adı bağlandığında VITE_SITE_URL ile geçilir. */
export const SITE_URL = (ENV_SITE_URL || "https://tedbirge-app.lovable.app").replace(/\/$/, "");

export function siteUrl(path = "/") {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}
