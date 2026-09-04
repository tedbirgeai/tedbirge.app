/**
 * TEDBİRGE® WEBOS — CORS İZİN LİSTESİ (TEK DOĞRULUK KAYNAĞI)
 * ------------------------------------------------------------------
 * Yazma yapan kamusal uç noktalar (telemetri, kuyruk, katılım) yalnız
 * kurumsal alan adlarından ve önizleme ortamından tarayıcı isteği
 * kabul eder. Tarayıcı dışı saha düğümleri CORS'a tabi değildir ve
 * bu daraltmadan etkilenmez.
 */

const ALLOWED_ORIGINS = [
  "https://tedbirge.app",
  "https://www.tedbirge.app",
  "https://tedbirge.dev",
  "https://www.tedbirge.dev",
];

/** Önizleme/yerel geliştirme ortamları. */
function isTrustedPreview(origin: string): boolean {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:" && protocol !== "http:") return false;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    return (
      hostname.endsWith(".lovable.app") ||
      hostname.endsWith(".lovableproject.com") ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin) || isTrustedPreview(origin);
}

/**
 * İstek başlıklarına göre CORS başlıkları üretir.
 * İzinli olmayan kaynaklara `Access-Control-Allow-Origin` verilmez.
 */
export function corsHeaders(
  request: Request,
  extra: { methods?: string; headers?: string } = {},
): Record<string, string> {
  const origin = request.headers.get("origin");
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": extra.methods ?? "POST, OPTIONS",
    "Access-Control-Allow-Headers": extra.headers ?? "Content-Type, X-Tedbirge-License",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) base["Access-Control-Allow-Origin"] = origin as string;
  return base;
}

/** Salt-okunur kamusal uçlar (sağlık, ping, OpenAPI) için serbest başlıklar. */
export const PUBLIC_READ_CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
