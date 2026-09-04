/**
 * ABONELİK DURUMU TAZELEME
 * ------------------------------------------------------------------
 * Ödeme penceresi kapandıktan sonra lisans/abonelik satırı sağlayıcıdan
 * gelen bildirimle yazılır; bu birkaç saniye sürebilir. Buradaki yardımcılar
 * tüm ekranların (Mağaza, Profil, Panel) aynı anda ve sayfa yenilemeden
 * güncel duruma geçmesini sağlar.
 */

const EVENT = "tedbirge:subscription-changed";

/** Ödeme tamamlandığında veya plan değiştiğinde tüm ekranları uyarır. */
export function notifySubscriptionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Uyarıyı dinler; temizleyici döndürür. */
export function onSubscriptionChanged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

/**
 * Adres çubuğundaki `?checkout=success` işaretini bir kez okur ve temizler.
 * Böylece sayfa yenilendiğinde tekrar tetiklenmez.
 */
export function consumeCheckoutSuccess(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  if (url.searchParams.get("checkout") !== "success") return false;
  url.searchParams.delete("checkout");
  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  return true;
}

/** Ödeme sonrası kısa aralıklarla yeniden okur; temizleyici döndürür. */
export function scheduleSubscriptionRefresh(reload: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const timers = [1500, 5000, 12000, 25000].map((ms) => window.setTimeout(reload, ms));
  return () => timers.forEach((t) => window.clearTimeout(t));
}
