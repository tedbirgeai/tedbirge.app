/**
 * ÜRETİLEN UYGULAMA ÇALIŞMA ZAMANI (ana iş parçacığı istemcisi)
 * ------------------------------------------------------------------
 * Her uygulama kendi işçisinde çalışır. Her çağrıya `WATCHDOG_MS` süre
 * tanınır; aşılırsa işçi `terminate()` ile zorla sonlandırılır. Tüm
 * arızalar desktop IPC üzerinden kabuğa (`shell.faults`) bildirilir.
 * Worker yoksa ana iş parçacığında yedek çalıştırma YAPILMAZ.
 */

import type { FaultReason, RuntimeIn, RuntimeOut, RuntimeStatus } from "@/lib/studio/app-runtime-protocol";
import { notifyError } from "@/lib/shell/notify";
import { issueVfsToken } from "@/lib/vfs/tokens";
import { onIpc, postIpc } from "@/shell/desktop-ipc";

export const WATCHDOG_MS = 1500;
export const FAULT_TARGET = "shell.faults";

export type WorkerLike = {
  postMessage(msg: RuntimeIn): void;
  terminate(): void;
  onmessage: ((e: MessageEvent<RuntimeOut>) => void) | null;
  onerror: ((e: Event) => void) | null;
  onmessageerror: ((e: Event) => void) | null;
};

export type AppFault = { appId: string; reason: FaultReason; message: string; ms: number };

export class RuntimeFault extends Error {
  constructor(readonly fault: AppFault) {
    super(fault.message);
  }
}

const REASON_TITLE: Record<FaultReason, string> = {
  timeout: "zaman aşımıyla durduruldu",
  crash: "çöktü",
  load: "başlatılamadı",
  unsupported: "çalıştırılamadı",
};

export function faultTitle(name: string, reason: FaultReason): string {
  return `${name} ${REASON_TITLE[reason]}`;
}

/* ------------------------- kabuk tarafı dinleyici ------------------------ */

let shellListening = false;

/** Kabuğun arıza kanalını bir kez kurar; IPC doğrulamasından geçen mesaj bildirim olur. */
export function ensureShellFaultListener(): void {
  if (shellListening) return;
  shellListening = true;
  onIpc(FAULT_TARGET, (msg) => {
    const p = msg.payload as Partial<AppFault> & { name?: string };
    if (!p || typeof p.message !== "string" || typeof p.reason !== "string") return;
    notifyError(faultTitle(p.name ?? msg.from, p.reason as FaultReason), p.message);
  });
}

export async function reportFault(fault: AppFault, name: string): Promise<void> {
  ensureShellFaultListener();
  try {
    const cap = await issueVfsToken(fault.appId, "write", FAULT_TARGET);
    await postIpc({ from: fault.appId, to: FAULT_TARGET, kind: "app.fault", payload: { ...fault, name }, cap });
  } catch {
    // IPC kurulamadıysa kabuk yine de kullanıcıyı bilgilendirir.
    notifyError(faultTitle(name, fault.reason), fault.message);
  }
}

/* ------------------------------ istemci -------------------------------- */

export function defaultWorkerFactory(): WorkerLike | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  return new Worker(new URL("./app-runtime.worker.ts", import.meta.url), {
    type: "module",
  }) as unknown as WorkerLike;
}

type Options = {
  appId: string;
  module: string;
  status: () => RuntimeStatus;
  onLog?: (line: string) => void;
  onFault?: (fault: AppFault) => void;
  factory?: () => WorkerLike | null;
  limitMs?: number;
};

export type AppRuntime = {
  ready: Promise<void>;
  call(fn: string, args: number[]): Promise<number | null>;
  dispose(): void;
  readonly dead: boolean;
};

export function startAppRuntime(opts: Options): AppRuntime {
  const limit = opts.limitMs ?? WATCHDOG_MS;
  const pending = new Map<number, { resolve: (v: number | null) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  let seq = 0;
  let dead = false;
  let worker: WorkerLike | null = null;
  let readyResolve: () => void = () => {};
  let readyReject: (e: Error) => void = () => {};
  const ready = new Promise<void>((res, rej) => {
    readyResolve = res;
    readyReject = rej;
  });
  ready.catch(() => {});

  const kill = (fault: AppFault) => {
    if (dead) return;
    dead = true;
    worker?.terminate();
    worker = null;
    const err = new RuntimeFault(fault);
    readyReject(err);
    pending.forEach((p) => {
      clearTimeout(p.timer);
      p.reject(err);
    });
    pending.clear();
    opts.onFault?.(fault);
  };

  try {
    worker = (opts.factory ?? defaultWorkerFactory)();
  } catch {
    worker = null;
  }
  if (!worker) {
    kill({
      appId: opts.appId,
      reason: "unsupported",
      message: "Bu tarayıcı ayrı iş parçacığını desteklemiyor; güvenlik için uygulama çalıştırılmadı.",
      ms: 0,
    });
  } else {
    const w = worker;
    const bootTimer = setTimeout(
      () => kill({ appId: opts.appId, reason: "timeout", message: `Çekirdek ${limit} ms içinde açılmadı; işçi sonlandırıldı.`, ms: limit }),
      limit * 4,
    );
    w.onmessage = (e) => {
      const m = e.data;
      if (m.t === "ready") {
        clearTimeout(bootTimer);
        readyResolve();
      } else if (m.t === "log") opts.onLog?.(m.line.slice(0, 1100));
      else if (m.t === "result") {
        const p = pending.get(m.id);
        if (!p) return;
        clearTimeout(p.timer);
        pending.delete(m.id);
        p.resolve(m.value);
      } else if (m.t === "error") {
        clearTimeout(bootTimer);
        kill({ appId: opts.appId, reason: m.reason, message: m.message, ms: 0 });
      }
    };
    w.onerror = (ev) => {
      ev.preventDefault?.();
      clearTimeout(bootTimer);
      kill({ appId: opts.appId, reason: "crash", message: "Çekirdek iş parçacığı beklenmedik biçimde durdu.", ms: 0 });
    };
    w.onmessageerror = () =>
      kill({ appId: opts.appId, reason: "crash", message: "Çekirdekten okunamayan bir yanıt geldi.", ms: 0 });
    w.postMessage({ t: "init", module: opts.module, status: opts.status() });
  }

  return {
    ready,
    get dead() {
      return dead;
    },
    async call(fn, args) {
      await ready;
      if (dead || !worker) return null;
      const id = ++seq;
      const w = worker;
      return new Promise<number | null>((resolve, reject) => {
        const t0 = Date.now();
        const timer = setTimeout(
          () =>
            kill({
              appId: opts.appId,
              reason: "timeout",
              message: `"${fn}" ${limit} ms sınırını aştı (olası sonsuz döngü); çekirdek zorla durduruldu.`,
              ms: Date.now() - t0,
            }),
          limit,
        );
        pending.set(id, { resolve, reject, timer });
        w.postMessage({ t: "call", id, fn, args, status: opts.status() });
      });
    },
    dispose() {
      if (dead) return;
      dead = true;
      worker?.terminate();
      worker = null;
      pending.forEach((p) => clearTimeout(p.timer));
      pending.clear();
    },
  };
}
