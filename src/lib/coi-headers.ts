/**
 * FAZ D — ÇAPRAZ KAYNAK YALITIMI (COOP/COEP)
 * ------------------------------------------------------------------
 * SharedArrayBuffer yalnızca `crossOriginIsolated` sayfalarda kullanılabilir.
 * Yalıtım tüm siteye değil, yalnızca WebOS kabuğunun rotalarına uygulanır;
 * pazarlama/mevzuat sayfaları üçüncü taraf gömülü içerik kullandığından
 * (harita, ödeme çerçevesi) yalıtım dışında bırakılır.
 *
 * COEP olarak `credentialless` seçilir: kimlik bilgisi taşımayan çapraz
 * kaynak istekleri CORP başlığı olmadan da yüklenebilir.
 */

/** Yalıtım uygulanacak WebOS rota önekleri. */
export const ISOLATED_PREFIXES = ["/", "/chat", "/app", "/system", "/dashboard"] as const;

export function isIsolatedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ISOLATED_PREFIXES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

export const COI_HEADERS: Record<string, string> = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Resource-Policy": "same-site",
};

/** Yanıta yalıtım başlıklarını ekler (yalnızca HTML gezinme yanıtları). */
export function withCoiHeaders(response: Response, pathname: string): Response {
  if (!isIsolatedPath(pathname)) return response;
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(COI_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
