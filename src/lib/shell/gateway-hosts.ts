/**
 * TEDBİRGE GEÇİDİ — İZİN LİSTESİ (TEK DOĞRULUK KAYNAĞI)
 * ------------------------------------------------------------------
 * Sunucu rotası (`/api/public/gecit`) ve istemci strateji katmanı aynı
 * listeyi okur; iki taraf asla birbirinden sapamaz.
 *
 * Listeye yalnız şu üç şartı sağlayan hedefler girer:
 *  1) kamusal ve oturumsuz (giriş/çerez/hesap gerektirmez),
 *  2) salt-okunur (GET; form yalnız arama sorgusu),
 *  3) kullanım şartları makine erişimini yasaklamıyor.
 *
 * Oturum gerektiren servisler (WhatsApp, LinkedIn, Google hesabı,
 * Spotify) buraya EKLENMEZ; onlar Web Kabuğu kartı ve "Harici Sekmede
 * Aç" ile çalışır. Bu sınır, Tedbirge'nin VPN/proxy olmama kuralıdır.
 */

export const GATEWAY_HOSTS = [
  // Arama (oturumsuz, sade HTML)
  "duckduckgo.com",
  "html.duckduckgo.com",
  "lite.duckduckgo.com",
  "startpage.com",
  "search.marginalia.nu",
  "old-search.marginalia.nu",
  "searx.be",

  // Bilgi ve ansiklopedi
  "wikipedia.org",
  "m.wikipedia.org",
  "wiktionary.org",
  "wikisource.org",
  "wikidata.org",
  "wikimedia.org",
  "wikibooks.org",
  "openlibrary.org",
  "gutenberg.org",
  "arxiv.org",

  // Harita ve açık veri
  "openstreetmap.org",
  "opentopomap.org",
  "overpass-turbo.eu",
  "overpass-api.de",

  // Haber ve akış
  "news.ycombinator.com",
  "hnrss.org",
  "lobste.rs",
  "nitter.net",

  // Teknik dokümantasyon (salt-okunur)
  "developer.mozilla.org",
  "docs.rs",
  "pypi.org",
  "raw.githubusercontent.com",
  "gist.github.com",

  // Zincir ve piyasa verisi
  "blockscout.com",
  "ipfs.io",
  "coingecko.com",

  // Standart ve uyum dokümanları
  "etsi.org",
  "itu.int",
] as const;

/** Geçidin bu hedefi aktarmasına izin verilip verilmediği. */
export function isGatewayHostAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return GATEWAY_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
}

/** Tam adres için izin denetimi (yalnız https). */
export function gatewayAllowed(target: string): boolean {
  try {
    const u = new URL(target);
    if (u.protocol !== "https:") return false;
    return isGatewayHostAllowed(u.hostname);
  } catch {
    return false;
  }
}
