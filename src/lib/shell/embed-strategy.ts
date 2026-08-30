/**
 * PENCERE İÇİ GÖMME STRATEJİSİ
 * ------------------------------------------------------------------
 * Bir web hedefi için sırayla denenecek kaynakları üretir. Amaç:
 * kullanıcıyı hiçbir zaman pencere dışına (yeni sekmeye) yollamamak.
 *
 *  1) doğrudan  → hedef zaten gömmeye izin veriyor
 *  2) eşdeğer   → aynı içeriği gösteren gömme dostu adres
 *  3) geçit     → /api/public/gecit üzerinden salt-okunur aktarım
 */

import type { WebAppEntry } from "@/shell/web-apps";

export type EmbedStage = {
  /** Çerçeveye verilecek adres. */
  src: string;
  /** Kullanıcıya gösterilecek kısa açıklama. */
  note: string;
};

export function gatewayUrl(target: string): string {
  return `/api/public/gecit?url=${encodeURIComponent(target)}`;
}

export function buildStages(app: Pick<WebAppEntry, "url" | "embed" | "embedUrl" | "proxy">): EmbedStage[] {
  const stages: EmbedStage[] = [];

  if (app.embedUrl) {
    stages.push({ src: app.embedUrl, note: "Gömme uyumlu görünüm" });
  }
  // Geçit her zaman çerçevelenebilir; gömmeyi reddeden hedeflerde beyaz
  // pencere yaşanmaması için doğrudan bağlantıdan önce denenir.
  if (app.proxy) {
    stages.push({ src: gatewayUrl(app.proxy === true ? app.url : app.proxy), note: "Tedbirge Geçidi" });
  }
  if (app.embed !== "popup") {
    stages.push({ src: app.url, note: "Doğrudan bağlantı" });
  }
  if (!app.proxy && app.embed !== "iframe") {
    stages.push({ src: gatewayUrl(app.url), note: "Tedbirge Geçidi" });
  }

  // Hiçbir strateji tanımlı değilse yine de doğrudan denenir.
  if (stages.length === 0) stages.push({ src: app.url, note: "Doğrudan bağlantı" });
  return stages;
}

