/**
 * Bulut deposu geçici olarak ulaşılamaz olduğunda uç noktaların 500 yerine
 * "hizmet geçici olarak kapalı" (503) dönmesini sağlayan koruma.
 * İstemciler bu cevabı görüp yerel kuyrukta bekletir; arayüz boş ekrana düşmez.
 */
export async function storeGuard(
  run: () => Promise<Response>,
  headers: Record<string, string> = {},
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    console.error("[api] depo erişilemedi", error);
    return new Response(JSON.stringify({ error: "depo_kapali", degraded: true }), {
      status: 503,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
    });
  }
}
