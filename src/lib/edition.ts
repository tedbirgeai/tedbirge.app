/**
 * ÇALIŞAN SİSTEMİN ÜRÜN SÜRÜMÜ — Workstation / Touch & Mobile
 * ------------------------------------------------------------------
 * Bare-metal imaj, derleme sırasında web köküne `tedbirge-image.json`
 * bırakır. Tarayıcı kolunda (tedbirge.app) bu dosya yoktur; o durumda
 * sürüm "web" kabul edilir ve dokunmatik varsayılanları cihaz
 * algılamasına bırakılır. Tek kod tabanı, tek doğruluk kaynağı.
 */

export type SystemEdition = "workstation" | "touch" | "web";

export type SystemImageInfo = {
  edition: SystemEdition;
  version: string;
  distribution: string;
};

let cache: Promise<SystemImageInfo> | null = null;

/** Çalışan sistemin imaj bilgisini okur (tek kez indirilir, önbelleklenir). */
export function fetchSystemImageInfo(): Promise<SystemImageInfo> {
  if (cache) return cache;
  const fallback: SystemImageInfo = { edition: "web", version: "", distribution: "" };
  if (typeof fetch === "undefined") {
    cache = Promise.resolve(fallback);
    return cache;
  }
  const promise: Promise<SystemImageInfo> = fetch("/tedbirge-image.json", {
    headers: { Accept: "application/json" },
  })
    .then(async (res) => {
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        edition?: string;
        version?: string;
        distribution?: string;
      };
      const edition: SystemEdition =
        data.edition === "workstation" || data.edition === "touch" ? data.edition : "web";
      return {
        edition,
        version: typeof data.version === "string" ? data.version : "",
        distribution: typeof data.distribution === "string" ? data.distribution : "",
      };
    })
    .catch(() => fallback);
  cache = promise;
  return promise;
}

/** Bu cihaz dokunmatik sürümle mi çalışıyor? */
export async function isTouchEdition(): Promise<boolean> {
  return (await fetchSystemImageInfo()).edition === "touch";
}
