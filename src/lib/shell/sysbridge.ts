/**
 * GÜÇ KÖPRÜSÜ İSTEMCİSİ
 * ------------------------------------------------------------------
 * Kabuk bir tarayıcı içinde çalıştığı için anakarta doğrudan sinyal
 * gönderemez. Kurulu cihazda `tedbirge-sysbridge` servisi 127.0.0.1
 * üzerinde dinler ve isteği ACPI sinyaline çevirir.
 *
 * Servis yoksa (tarayıcı kolu) güç düğmeleri hiç gösterilmez —
 * çalışmayan bir düğme sunmak yerine hiç sunmamak yeğlenir.
 */

export type PowerAction = "kapat" | "yeniden-baslat" | "uyku" | "derin-uyku";

/** Servis vekilinin tabanı; nginx yalnız yerel isteklere açar. */
const BASE = "/sys-api";

export const POWER_LABELS: Record<PowerAction, string> = {
  kapat: "Kapat",
  "yeniden-baslat": "Yeniden başlat",
  uyku: "Uyku",
  "derin-uyku": "Derin uyku",
};

let cached: boolean | null = null;

/** Güç köprüsü bu cihazda var mı? Sonuç oturum boyunca önbelleklenir. */
export async function powerBridgeReady(): Promise<boolean> {
  if (cached !== null) return cached;
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch(`${BASE}/durum`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) {
      cached = false;
      return false;
    }
    const data = (await res.json()) as { mesaj?: string };
    cached = data.mesaj === "hazir";
  } catch {
    cached = false;
  }
  return cached;
}

/**
 * Güç komutunu gönderir. Servis önce diski senkronize eder, sonra
 * ACPI sinyalini iletir; bu yüzden bağlantının kopması başarı sayılır.
 */
export async function requestPower(action: PowerAction): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${BASE}/guc/${action}`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json().catch(() => ({}))) as { mesaj?: string };
    return {
      ok: res.ok,
      message: data.mesaj ?? (res.ok ? POWER_LABELS[action] : "Komut uygulanamadı"),
    };
  } catch {
    // Kapanış sırasında sunucu düşer; bu beklenen davranıştır.
    return { ok: true, message: `${POWER_LABELS[action]} komutu gönderildi` };
  }
}
