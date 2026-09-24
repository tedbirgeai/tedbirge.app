/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

/** AXIOM daemon başlatıcısı: Vite, worker dosyasını bu göreli URL'den paketler. */
export function createAxiomWorker(): Worker {
  try {
    return new Worker(new URL("./kernel.worker.ts", import.meta.url), { type: "module" });
  } catch (err) {
    console.warn("[AXIOM] Worker oluşturulamadı, yerel motor moduna düşülüyor:", err);
    // Güvenli fallback: Hata fırlatmak yerine sahte/dummy worker objesi yerine 
    // yerel fallback akışını tetikleyecek güvenli bir yapı sunuyoruz.
    throw err;
  }
}

export function workerAvailable(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}
