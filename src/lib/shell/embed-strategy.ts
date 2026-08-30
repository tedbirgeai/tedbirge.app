/**
 * PENCERE İÇİ GÖMME STRATEJİSİ
 * ------------------------------------------------------------------
 * Bir web hedefi için sırayla denenecek kaynakları üretir.
 *
 *  1) eşdeğer  → aynı içeriği gösteren gömme dostu adres
 *  2) doğrudan → hedef zaten gömmeye izin veriyor
 *
 * Tedbirge Geçidi artık otomatik zincirin parçası DEĞİLDİR: sunucu
 * tarafı bulunmayan statik dağıtımlarda kırıldığı ve izin listesi
 * dışındaki hedeflerde 403 döndüğü için yalnız kullanıcı açıkça
 * isterse ve hedef izin listesindeyse devreye girer.
 */

import type { WebAppEntry } from "@/shell/web-apps";

export type EmbedStage = {
  /** Çerçeveye verilecek adres. */
  src: string;
  /** Kullanıcıya gösterilecek kısa açıklama. */
  note: string;
};

/** Sunucudaki geçit izin listesinin istemci kopyası. */
const GATEWAY_HOSTS = [
  "duckduckgo.com",
  "wikipedia.org",
  "openstreetmap.org",
  "blockscout.com",
  "ipfs.io",
  "coingecko.com",
  "nitter.net",
  "startpage.com",
  "ecosia.org",
  "bing.com",
  "hnrss.org",
  "news.ycombinator.com",
];

/** Geçidin bu hedefi aktarmasına izin verilip verilmediği. */
export function gatewayAllowed(target: string): boolean {
  try {
    const u = new URL(target);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    return GATEWAY_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
  } catch {
    return false;
  }
}

export function gatewayUrl(target: string): string {
  return `/api/public/gecit?url=${encodeURIComponent(target)}`;
}

export function buildStages(
  app: Pick<WebAppEntry, "url" | "embed" | "embedUrl" | "proxy">,
): EmbedStage[] {
  const stages: EmbedStage[] = [];

  if (app.embedUrl) {
    stages.push({ src: app.embedUrl, note: "Gömme uyumlu görünüm" });
  }
  if (app.embed !== "popup") {
    stages.push({ src: app.url, note: "Doğrudan bağlantı" });
  }

  // Hiçbir strateji tanımlı değilse yine de doğrudan denenir.
  if (stages.length === 0) stages.push({ src: app.url, note: "Doğrudan bağlantı" });
  return stages;
}
