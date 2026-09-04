/**
 * PORTAL YEREL DEPOSU (IndexedDB)
 * ------------------------------------------------------------------
 * Liste verileri IndexedDB'de, görünüm tercihleri yerel depolamada
 * tutulur. Sunucuya hiçbir istek gitmez; tarayıcı yoksa (SSR) bellek
 * içi güvenli varsayılanlara düşülür.
 */

import { openDB, type IDBPDatabase } from "idb";

import { seedLogs, seedNodes, seedUsers } from "@/lib/portal/seed";
import type { PortalLog, PortalNode, PortalUser } from "@/lib/portal/types";

const DB_NAME = "tedbirge-portal";
const DB_VERSION = 1;
const SEED_FLAG = "tbos.portal.seeded.v1";
const PREFS_KEY = "tbos.portal.prefs.v1";

type Stores = {
  nodes: PortalNode;
  users: PortalUser;
  logs: PortalLog;
};

export type StoreName = keyof Stores;

let dbPromise: Promise<IDBPDatabase> | null = null;

function hasIdb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        for (const name of ["nodes", "users", "logs"] as StoreName[]) {
          if (!database.objectStoreNames.contains(name)) {
            database.createObjectStore(name, { keyPath: "id" });
          }
        }
      },
    });
  }
  return dbPromise;
}

async function readAll<K extends StoreName>(name: K): Promise<Stores[K][]> {
  if (!hasIdb()) return [];
  return (await (await db()).getAll(name)) as Stores[K][];
}

async function writeAll<K extends StoreName>(name: K, rows: Stores[K][]): Promise<void> {
  if (!hasIdb()) return;
  const database = await db();
  const tx = database.transaction(name, "readwrite");
  await tx.store.clear();
  for (const row of rows) await tx.store.put(row);
  await tx.done;
}

export async function putRow<K extends StoreName>(name: K, row: Stores[K]): Promise<void> {
  if (!hasIdb()) return;
  await (await db()).put(name, row);
}

export async function deleteRow(name: StoreName, id: string): Promise<void> {
  if (!hasIdb()) return;
  await (await db()).delete(name, id);
}

export type PortalSnapshot = {
  nodes: PortalNode[];
  users: PortalUser[];
  logs: PortalLog[];
};

/** İlk açılışta tohum veriyi yazar, sonraki açılışlarda kullanıcı verisini döner. */
export async function loadSnapshot(): Promise<PortalSnapshot> {
  const now = Date.now();
  if (!hasIdb()) {
    return { nodes: seedNodes(now), users: seedUsers(now), logs: seedLogs(now) };
  }
  const seeded = window.localStorage.getItem(SEED_FLAG) === "1";
  if (!seeded) return resetSnapshot();
  const [nodes, users, logs] = await Promise.all([
    readAll("nodes"),
    readAll("users"),
    readAll("logs"),
  ]);
  if (nodes.length === 0 && users.length === 0 && logs.length === 0) return resetSnapshot();
  return { nodes, users, logs };
}

/** Portal verisini fabrika ayarlarına döndürür. */
export async function resetSnapshot(): Promise<PortalSnapshot> {
  const now = Date.now();
  const snapshot: PortalSnapshot = {
    nodes: seedNodes(now),
    users: seedUsers(now),
    logs: seedLogs(now),
  };
  await Promise.all([
    writeAll("nodes", snapshot.nodes),
    writeAll("users", snapshot.users),
    writeAll("logs", snapshot.logs),
  ]);
  if (typeof window !== "undefined") window.localStorage.setItem(SEED_FLAG, "1");
  return snapshot;
}

/** Görünüm tercihleri (sekme, sayfa boyutu) yerel depolamada saklanır. */
export type PortalPrefs = {
  tab: "metrics" | "users" | "logs";
  pageSize: number;
};

const DEFAULT_PREFS: PortalPrefs = { tab: "metrics", pageSize: 5 };

export function readPrefs(): PortalPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<PortalPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function writePrefs(prefs: PortalPrefs): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
