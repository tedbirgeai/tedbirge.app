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
export const ISOLATED_PREFIXES = ["/", "/chat"] as const;

export function isIsolatedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return ISOLATED_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

export const COI_HEADERS: Record<string, string> = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
  "Cross-Origin-Resource-Policy": "same-site",
};

/**
 * Betik yanıtları da yalıtım başlığı taşımalıdır: COEP uygulanan bir sayfa
 * içinde `new Worker(...)` çağrısı, işçi betiği COEP başlığı taşımazsa
 * tarayıcı tarafından ERR_BLOCKED_BY_RESPONSE ile reddedilir.
 */
export function isScriptResponse(contentType: string): boolean {
  return contentType.includes("javascript") || contentType.includes("ecmascript");
}

/** Yanıta yalıtım başlıklarını ekler (HTML gezinmeleri ve betik/işçi yanıtları). */
export function withCoiHeaders(response: Response, pathname: string): Response {
  const type = response.headers.get("content-type") ?? "";
  const isHtml = type.includes("text/html");
  if (isHtml && !isIsolatedPath(pathname)) return response;
  if (!isHtml && !isScriptResponse(type)) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(COI_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
