/**
 * PENCERE İÇİ GÖMME STRATEJİSİ
 * ------------------------------------------------------------------
 * Bir web hedefi için sırayla denenecek kaynakları üretir.
 *
 *  1) eşdeğer  → aynı içeriği gösteren gömme dostu adres
 *  2) geçit    → hedef izin listesindeyse Tedbirge Geçidi üzerinden
 *  3) doğrudan → hedef zaten gömmeye izin veriyor
 *
 * Geçit aşaması yalnız izin listesindeki (kamusal, oturumsuz) hedefler
 * için eklenir; listede olmayan hedeflerde hiç denenmez, böylece 403
 * ekranı ya da tarayıcının kendi ret sayfası hiç görünmez.
 */

import { gatewayAllowed } from "@/lib/shell/gateway-hosts";
import type { WebAppEntry } from "@/shell/web-apps";

export { gatewayAllowed };

export type EmbedStage = {
  /** Çerçeveye verilecek adres. */
  src: string;
  /** Kullanıcıya gösterilecek kısa açıklama. */
  note: string;
};

export function gatewayUrl(target: string): string {
  return `/api/public/gecit?url=${encodeURIComponent(target)}`;
}

/** Uygulamanın geçit üzerinden aktarılacak hedef adresi. */
export function gatewayTarget(
  app: Pick<WebAppEntry, "url" | "proxy">,
): string | null {
  // Açık `proxy` tanımı önceliklidir; tanım yoksa hedefin kendisi izin
  // listesindeyse Geçit yine de otomatik denenir (kullanıcı elle
  // "Geçit Üzerinden Çalıştır" demek zorunda kalmaz).
  const target = typeof app.proxy === "string" ? app.proxy : app.url;
  if (!target) return null;
  return gatewayAllowed(target) ? target : null;
}

export function buildStages(
  app: Pick<WebAppEntry, "url" | "embed" | "embedUrl" | "proxy">,
): EmbedStage[] {
  const stages: EmbedStage[] = [];

  if (app.embedUrl) {
    stages.push({ src: app.embedUrl, note: "Gömme uyumlu görünüm" });
  }

  const proxied = gatewayTarget(app);
  if (proxied) {
    stages.push({ src: gatewayUrl(proxied), note: "Tedbirge Geçidi" });
  }

  if (app.embed !== "popup") {
    stages.push({ src: app.url, note: "Doğrudan bağlantı" });
  }

  // Hiçbir strateji tanımlı değilse yine de doğrudan denenir.
  if (stages.length === 0) stages.push({ src: app.url, note: "Doğrudan bağlantı" });
  return stages;
}
