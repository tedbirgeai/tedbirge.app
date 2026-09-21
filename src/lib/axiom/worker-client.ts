/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

/** AXIOM daemon başlatıcısı: Vite, worker dosyasını bu göreli URL'den paketler. */
export function createAxiomWorker(): Worker {
  return new Worker(new URL("./kernel.worker.ts", import.meta.url), { type: "module" });
}
