/**
 * SERVİS KAYIT DEFTERİ VE DENETLEYİCİ
 * ------------------------------------------------------------------
 * Arka plan servisleri bağımlılık sırasıyla başlatılır, izlenir ve
 * düştüklerinde artan beklemeyle yeniden başlatılır. Eşik aşılırsa
 * servis "failed" olur ve yalnız elle yeniden başlatılabilir.
 */

export type ServiceStatus = "idle" | "starting" | "running" | "degraded" | "failed" | "stopped";

export type ServiceDef = {
  name: string;
  deps?: string[];
  /** Başlatır; isteğe bağlı durdurma işlevi döndürür. */
  start: () => unknown | Promise<unknown>;
  /** Kalp atışı; false dönerse servis düşmüş sayılır. */
  health?: () => boolean;
};

export type ServiceInfo = {
  name: string;
  status: ServiceStatus;
  restarts: number;
  lastError: string | null;
  since: number;
};

export type ServiceEvent = { at: number; name: string; status: ServiceStatus; detail?: string };

export const MAX_RESTARTS = 5;
export const BASE_BACKOFF_MS = 200;
export const MAX_BACKOFF_MS = 3200;

export function backoffMs(attempt: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt));
}

/** Bağımlılık sırası (Kahn). Döngü veya eksik bağımlılıkta fırlatır. */
export function topoOrder(defs: readonly ServiceDef[]): string[] {
  const names = new Set(defs.map((d) => d.name));
  const indeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const d of defs) {
    indeg.set(d.name, indeg.get(d.name) ?? 0);
    for (const dep of d.deps ?? []) {
      if (!names.has(dep)) throw new Error(`Eksik bağımlılık: ${d.name} → ${dep}`);
      indeg.set(d.name, (indeg.get(d.name) ?? 0) + 1);
      out.set(dep, [...(out.get(dep) ?? []), d.name]);
    }
  }
  const queue = defs.filter((d) => (indeg.get(d.name) ?? 0) === 0).map((d) => d.name);
  const order: string[] = [];
  while (queue.length) {
    const n = queue.shift() as string;
    order.push(n);
    for (const m of out.get(n) ?? []) {
      const v = (indeg.get(m) ?? 0) - 1;
      indeg.set(m, v);
      if (v === 0) queue.push(m);
    }
  }
  if (order.length !== defs.length) throw new Error("Servis bağımlılık döngüsü");
  return order;
}

type Entry = { def: ServiceDef; info: ServiceInfo; stop?: () => void; timer?: ReturnType<typeof setTimeout> };

export type ManagerOptions = {
  now?: () => number;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  heartbeatMs?: number;
};

export function createServiceManager(defs: readonly ServiceDef[], opts: ManagerOptions = {}) {
  const now = opts.now ?? Date.now;
  const schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const order = topoOrder(defs);
  const entries = new Map<string, Entry>();
  for (const def of defs) {
    entries.set(def.name, {
      def,
      info: { name: def.name, status: "idle", restarts: 0, lastError: null, since: now() },
    });
  }
  const events: ServiceEvent[] = [];
  const subs = new Set<() => void>();
  let snapshot: ServiceInfo[] = [];
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const refresh = () => {
    snapshot = order.map((n) => ({ ...(entries.get(n) as Entry).info }));
    subs.forEach((fn) => fn());
  };

  const set = (e: Entry, status: ServiceStatus, detail?: string) => {
    e.info = { ...e.info, status, since: now(), lastError: detail ?? (status === "running" ? null : e.info.lastError) };
    events.push({ at: now(), name: e.def.name, status, ...(detail ? { detail } : {}) });
    if (events.length > 500) events.splice(0, events.length - 500);
    refresh();
  };

  const depsReady = (e: Entry) =>
    (e.def.deps ?? []).every((d) => entries.get(d)?.info.status === "running");

  async function run(name: string): Promise<void> {
    const e = entries.get(name);
    if (!e || e.info.status === "running" || e.info.status === "starting") return;
    if (!depsReady(e)) {
      set(e, "degraded", "bağımlılık hazır değil");
      return;
    }
    set(e, "starting");
    try {
      const result = await e.def.start();
      if (typeof result === "function") e.stop = result as () => void;
      set(e, "running");
    } catch (err) {
      fail(e, err instanceof Error ? err.message : "başlatma hatası");
    }
  }

  function fail(e: Entry, detail: string) {
    try {
      e.stop?.();
    } catch {
      /* izole */
    }
    e.stop = undefined;
    if (e.info.restarts >= MAX_RESTARTS) {
      set(e, "failed", detail);
      return;
    }
    const attempt = e.info.restarts;
    e.info = { ...e.info, restarts: attempt + 1 };
    set(e, "degraded", detail);
    e.timer = schedule(() => void run(e.def.name), backoffMs(attempt));
  }

  return {
    order,
    async startAll() {
      for (const n of order) await run(n);
      if (opts.heartbeatMs && !heartbeat) {
        heartbeat = setInterval(() => this.check(), opts.heartbeatMs);
      }
    },
    /** Kalp atışı denetimi. */
    check() {
      for (const e of entries.values()) {
        if (e.info.status !== "running" || !e.def.health) continue;
        let ok = false;
        try {
          ok = e.def.health();
        } catch {
          ok = false;
        }
        if (!ok) fail(e, "kalp atışı yok");
      }
    },
    /** Elle yeniden başlatma: sayaç sıfırlanır. */
    async restart(name: string) {
      const e = entries.get(name);
      if (!e) return;
      if (e.timer) clearTimeout(e.timer);
      try {
        e.stop?.();
      } catch {
        /* izole */
      }
      e.stop = undefined;
      e.info = { ...e.info, restarts: 0, status: "stopped" };
      await run(name);
    },
    /** Test/teşhis için servisi düşmüş say. */
    crash(name: string, detail = "zorla düşürüldü") {
      const e = entries.get(name);
      if (e && e.info.status === "running") fail(e, detail);
    },
    stopAll() {
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = undefined;
      for (const n of [...order].reverse()) {
        const e = entries.get(n) as Entry;
        if (e.timer) clearTimeout(e.timer);
        try {
          e.stop?.();
        } catch {
          /* izole */
        }
        e.stop = undefined;
        set(e, "stopped");
      }
    },
    list: () => snapshot,
    events: () => events.slice(),
    subscribe(fn: () => void) {
      subs.add(fn);
      return () => void subs.delete(fn);
    },
  };
}

export type ServiceManager = ReturnType<typeof createServiceManager>;

/**
 * Tek sekme liderliği: Web Locks varsa kilidi tutan sekme lider olur;
 * kilit bırakılınca sıradaki sekme devralır. Yoksa her sekme lider sayılır.
 */
export function acquireLeadership(
  name: string,
  onLead: () => void,
  locks: LockManager | undefined = typeof navigator !== "undefined" ? navigator.locks : undefined,
): () => void {
  if (!locks) {
    onLead();
    return () => {};
  }
  let release: () => void = () => {};
  const held = new Promise<void>((r) => (release = r));
  void locks.request(name, () => {
    onLead();
    return held;
  });
  return release;
}
