/**
 * PORTAL DURUM YÖNETİMİ (Zustand)
 * ------------------------------------------------------------------
 * Tüm CRUD işlemleri önce bellekte, hemen ardından IndexedDB'de
 * uygulanır. Her değişiklik otomatik olarak günlük kaydına yazılır.
 */

import { create } from "zustand";

import {
  deleteRow,
  loadSnapshot,
  putRow,
  readPrefs,
  resetSnapshot,
  writePrefs,
  type PortalPrefs,
} from "@/lib/portal/db";
import type { LogLevel, MetricSample, PortalLog, PortalNode, PortalUser } from "@/lib/portal/types";

export type NodeDraft = Omit<PortalNode, "id" | "lastSeen"> & { id?: string };
export type UserDraft = Omit<PortalUser, "id" | "createdAt"> & { id?: string };

type PortalState = {
  ready: boolean;
  error: string | null;
  nodes: PortalNode[];
  users: PortalUser[];
  logs: PortalLog[];
  history: MetricSample[];
  prefs: PortalPrefs;
  load: () => Promise<void>;
  setPrefs: (patch: Partial<PortalPrefs>) => void;
  saveNode: (draft: NodeDraft) => Promise<void>;
  removeNode: (id: string) => Promise<void>;
  saveUser: (draft: UserDraft) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  clearLogs: () => Promise<void>;
  resetAll: () => Promise<void>;
  sample: () => void;
};

function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

function sampleOf(nodes: PortalNode[]): MetricSample {
  const live = nodes.filter((n) => n.status !== "cevrimdisi");
  const avg = (pick: (n: PortalNode) => number) =>
    live.length === 0 ? 0 : Math.round(live.reduce((s, n) => s + pick(n), 0) / live.length);
  return {
    at: Date.now(),
    cpu: avg((n) => n.cpu),
    memory: avg((n) => n.memory),
    quality: avg((n) => n.quality),
  };
}

export const usePortal = create<PortalState>((set, get) => ({
  ready: false,
  error: null,
  nodes: [],
  users: [],
  logs: [],
  history: [],
  prefs: readPrefs(),

  load: async () => {
    try {
      const snapshot = await loadSnapshot();
      const history = seedHistory(snapshot.nodes);
      set({ ...snapshot, history, ready: true, error: null });
    } catch (err) {
      set({
        ready: true,
        error: err instanceof Error ? err.message : "Yerel veri okunamadı.",
      });
    }
  },

  setPrefs: (patch) => {
    const prefs = { ...get().prefs, ...patch };
    writePrefs(prefs);
    set({ prefs });
  },

  saveNode: async (draft) => {
    const existing = draft.id ? get().nodes.find((n) => n.id === draft.id) : undefined;
    const node: PortalNode = {
      ...draft,
      id: draft.id ?? newId("nd"),
      lastSeen: Date.now(),
    };
    await putRow("nodes", node);
    set((s) => ({
      nodes: existing ? s.nodes.map((n) => (n.id === node.id ? node : n)) : [node, ...s.nodes],
    }));
    await appendLog(
      set,
      existing ? "bilgi" : "bilgi",
      "ag",
      existing
        ? `${node.label} düğümü güncellendi (${node.status}).`
        : `${node.label} düğümü eklendi.`,
    );
    get().sample();
  },

  removeNode: async (id) => {
    const node = get().nodes.find((n) => n.id === id);
    await deleteRow("nodes", id);
    set((s) => ({ nodes: s.nodes.filter((n) => n.id !== id) }));
    await appendLog(set, "uyari", "ag", `${node?.label ?? id} düğümü kaldırıldı.`);
    get().sample();
  },

  saveUser: async (draft) => {
    const existing = draft.id ? get().users.find((u) => u.id === draft.id) : undefined;
    const user: PortalUser = {
      ...draft,
      id: draft.id ?? newId("us"),
      createdAt: existing?.createdAt ?? Date.now(),
    };
    await putRow("users", user);
    set((s) => ({
      users: existing ? s.users.map((u) => (u.id === user.id ? user : u)) : [user, ...s.users],
    }));
    await appendLog(
      set,
      "bilgi",
      "kullanici",
      existing ? `${user.name} kaydı güncellendi.` : `${user.name} kullanıcısı eklendi.`,
    );
  },

  removeUser: async (id) => {
    const user = get().users.find((u) => u.id === id);
    await deleteRow("users", id);
    set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
    await appendLog(set, "uyari", "kullanici", `${user?.name ?? id} kaydı silindi.`);
  },

  clearLogs: async () => {
    for (const log of get().logs) await deleteRow("logs", log.id);
    set({ logs: [] });
    await appendLog(set, "bilgi", "sistem", "Günlük kayıtları temizlendi.");
  },

  resetAll: async () => {
    const snapshot = await resetSnapshot();
    set({ ...snapshot, history: seedHistory(snapshot.nodes), error: null });
  },

  sample: () => {
    set((s) => ({ history: [...s.history, sampleOf(s.nodes)].slice(-40) }));
  },
}));

/** Grafiklerin ilk açılışta boş kalmaması için son 20 dakikalık iz üretilir. */
function seedHistory(nodes: PortalNode[]): MetricSample[] {
  const base = sampleOf(nodes);
  const out: MetricSample[] = [];
  for (let i = 19; i >= 0; i -= 1) {
    const drift = (n: number, spread: number) =>
      Math.max(0, Math.min(100, Math.round(n + Math.sin(i / 2.2) * spread)));
    out.push({
      at: base.at - i * 60_000,
      cpu: drift(base.cpu, 7),
      memory: drift(base.memory, 5),
      quality: drift(base.quality, 3),
    });
  }
  return out;
}

type SetState = (
  partial: Partial<PortalState> | ((s: PortalState) => Partial<PortalState>),
) => void;

async function appendLog(
  set: SetState,
  level: LogLevel,
  source: string,
  message: string,
): Promise<void> {
  const log: PortalLog = { id: newId("lg"), at: Date.now(), level, source, message };
  await putRow("logs", log);
  set((s) => ({ logs: [log, ...s.logs] }));
}
