/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * SANAL ROM KATMANI (Immutable Axiom Base)
 * ------------------------------------------------------------------
 * Çekirdek aksiyomlar ve gramer kuralları IndexedDB'de salt-okunur
 * bloklar olarak tutulur. Yazılmış bir blok bir daha değiştirilmez;
 * tarayıcının önbellek baskısında silmemesi için kalıcı depolama izni
 * istenir. Çalışma zamanı RAM yükü yoktur: bloklar ihtiyaç anında
 * anahtarla okunur.
 */

const DB_NAME = "axiom-rom";
const STORE = "blocks";
const DB_VERSION = 1;

export type RomBlock = {
  key: string;
  label: string;
  /** Blok gövdesi (metin): gramer kuralı, aksiyom ya da değişmez. */
  body: string;
};

export type RomStatus = {
  available: boolean;
  persistent: boolean;
  blocks: number;
  bytes: number;
};

/** Çekirdek (değiştirilemez) ROM tohumu. */
export const ROM_SEED: RomBlock[] = [
  {
    key: "ask/ascii/1.0",
    label: "ASK ASCII/1.0 gramer çekirdeği",
    body: "byte-stream → token → sembol → AST; 8-bit ASCII ve UTF-8 bayt dizilimi tek gramerle ayrıştırılır.",
  },
  {
    key: "axiom/core/identity",
    label: "Kök aksiyom: kimlik",
    body: "Her önerme yalnız kendisiyle özdeştir; türetim zinciri kaynağına kadar izlenebilir olmalıdır.",
  },
  {
    key: "invariant/thermo/1",
    label: "Termodinamik 1. kanun",
    body: "Kapalı sistemde enerji korunur: dU = Q - W.",
  },
  {
    key: "invariant/shannon/capacity",
    label: "Shannon kanal kapasitesi",
    body: "C = B · log2(1 + S/N); hiçbir kanal bu sınırın üzerinde hatasız veri taşımaz.",
  },
  {
    key: "invariant/godel/incompleteness",
    label: "Gödel eksiklik",
    body: "Tutarlı ve yeterince güçlü her biçimsel sistemde kanıtlanamayan doğru önermeler vardır.",
  },
  {
    key: "ledger/formal",
    label: "Biçimsel bilim kayıt defterleri",
    body: "Lean 4 Mathlib, SMT-LIB2, Metamath, Coq Standard Library, OEIS.",
  },
  {
    key: "ledger/physical",
    label: "Fizik ve kimya kayıt defterleri",
    body: "BIPM / CODATA, NIST SRD, IUPAC, CERN Open Data, IAU katalogları.",
  },
  {
    key: "ledger/engineering",
    label: "Mühendislik ve emniyet defterleri",
    body: "DO-178C, ISO 26262, IEC 61508, ISO/IEC 27001, NIST SP 800-53, IEEE SA.",
  },
  {
    key: "ledger/life",
    label: "Yaşam bilimleri defterleri",
    body: "PDB, NCBI GenBank, PubChem, UniProt, WHO ICD-11.",
  },
  {
    key: "ledger/earth",
    label: "Dünya ve çevre defterleri",
    body: "USGS, NOAA, IPCC, WMO, Copernicus.",
  },
  {
    key: "ledger/social",
    label: "Toplum, hukuk ve iktisat defterleri",
    body: "OECD, IMF, Eurostat, TÜİK, ISO 20022.",
  },
];

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB yok"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("ROM açılamadı"));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("ROM işlemi başarısız"));
    tx.onabort = () => reject(tx.error ?? new Error("ROM işlemi iptal"));
  });
}

/** Kalıcı depolama izni ister (tarayıcı onbellek temizlemesine karşı). */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage) return false;
    if (typeof navigator.storage.persisted === "function") {
      const already = await navigator.storage.persisted();
      if (already) return true;
    }
    if (typeof navigator.storage.persist === "function") return await navigator.storage.persist();
    return false;
  } catch {
    return false;
  }
}

/** Tohum bloklarını yalnız eksikse yazar (salt-okunur sözleşme). */
export async function seedRom(blocks: RomBlock[] = ROM_SEED): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const block of blocks) store.put(block);
  await done(tx);
  db.close();
}

/** Tek bloğu anahtarla okur (O(1)). */
export async function readBlock(key: string): Promise<RomBlock | null> {
  const db = await open();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).get(key);
  const value = await new Promise<RomBlock | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as RomBlock | undefined);
    req.onerror = () => reject(req.error ?? new Error("ROM okunamadı"));
  });
  db.close();
  return value ?? null;
}

/** ROM durumunu (blok sayısı, yaklaşık boyut, kalıcılık) döner. */
export async function romStatus(): Promise<RomStatus> {
  const persistent = await requestPersistence();
  try {
    const db = await open();
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    const all = await new Promise<RomBlock[]>((resolve, reject) => {
      req.onsuccess = () => resolve((req.result as RomBlock[]) ?? []);
      req.onerror = () => reject(req.error ?? new Error("ROM listelenemedi"));
    });
    db.close();
    const bytes = all.reduce((sum, b) => sum + b.key.length + b.label.length + b.body.length, 0);
    return { available: true, persistent, blocks: all.length, bytes };
  } catch {
    return { available: false, persistent, blocks: 0, bytes: 0 };
  }
}
