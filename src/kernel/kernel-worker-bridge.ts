/**
 * ÇEKİRDEK İŞÇİSİ KÖPRÜSÜ (ana iş parçacığı istemcisi)
 * ------------------------------------------------------------------
 * `kernel.worker.ts` ile ikili çerçeve üzerinden konuşur. Worker yoksa
 * (SSR, eski tarayıcı, worker kurulum hatası) aynı hesap senkron motorla
 * yapılır; çağıran taraf farkı hissetmez.
 */

import { decodeFrame, encodeFrame, IPC_PROTOCOL_VERSION, OP } from "@/kernel/ipc";
import { SharedRing, sharedMemoryAvailable } from "@/kernel/shared-ring";
import { decodeRouteResult, encodeRouteRequest, type RouteRequest } from "@/kernel/route-codec";
import { localSubgraph, shortestPath, type RouteResult } from "@/lib/mesh-routing";
import { transitConfig } from "@/lib/transit-config";

const TIMEOUT_MS = 1_500;

let worker: Worker | null = null;
let seq = 0;
const pending = new Map<number, (payload: ArrayBuffer) => void>();

/* ---------------- Faz D: paylaşımlı halka tampon (zero-copy) ---------------- */

let ringOut: SharedRing | null = null; // ana iş parçacığı → işçi
let ringIn: SharedRing | null = null; // işçi → ana iş parçacığı
let ringLoop = false;

function deliver(buf: ArrayBuffer) {
  const frame = decodeFrame(buf);
  if (!frame) return;
  const done = pending.get(frame.corrId);
  if (done) {
    pending.delete(frame.corrId);
    done(frame.payload);
  }
}

/** İşçi yanıtlarını halkadan okur; bekleme `Atomics.waitAsync` ile yapılır. */
async function ringReader() {
  if (ringLoop) return;
  ringLoop = true;
  try {
    for (;;) {
      const ring = ringIn;
      if (!ring) return;
      let drained = false;
      for (;;) {
        const msg = ring.pop();
        if (!msg) break;
        drained = true;
        deliver(msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength) as ArrayBuffer);
      }
      if (!drained) await ring.waitForData(25);
    }
  } finally {
    ringLoop = false;
  }
}

/** COOP/COEP açıksa halkaları kurar; değilse sessizce v1 yoluna kalınır. */
function setupRings(w: Worker) {
  if (!sharedMemoryAvailable()) return;
  try {
    const c2w = SharedRing.create(512 * 1024);
    const w2c = SharedRing.create(512 * 1024);
    ringOut = c2w;
    ringIn = w2c;
    w.postMessage({ t: "ring", c2w: c2w.sab, w2c: w2c.sab });
    void ringReader();
  } catch {
    ringOut = null;
    ringIn = null;
  }
}

/** Etkin taşıma katmanı (Ayarlar panelinde gösterilir). */
export function kernelTransport(): { shared: boolean; protocol: number; isolated: boolean } {
  return {
    shared: ringOut !== null && ringIn !== null,
    protocol: IPC_PROTOCOL_VERSION,
    isolated: sharedMemoryAvailable(),
  };
}

function ensureWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("./kernel.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<ArrayBuffer>) => deliver(e.data);
    worker.onerror = () => {
      worker = null;
      ringOut = null;
      ringIn = null;
    };
    setupRings(worker);
  } catch {
    worker = null;
  }
  return worker;
}

function call(op: number, payload: ArrayBuffer): Promise<ArrayBuffer | null> {
  const w = ensureWorker();
  if (!w) return Promise.resolve(null);
  const corrId = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pending.delete(corrId)) resolve(null);
    }, TIMEOUT_MS);
    pending.set(corrId, (buf) => {
      clearTimeout(timer);
      resolve(buf);
    });
    const frame = encodeFrame(op, corrId, payload);
    try {
      // Faz D: önce paylaşımlı halka (kopyasız); dolu/yoksa Transferable yolu.
      if (ringOut?.push(new Uint8Array(frame))) return;
      w.postMessage(frame, [frame]);
    } catch {
      clearTimeout(timer);
      pending.delete(corrId);
      resolve(null);
    }
  });
}

/** Rota hesabını işçiye devreder; başarısızsa senkron motora düşer. */
export async function routeInWorker(req: RouteRequest): Promise<RouteResult> {
  const fallback = () => {
    const scoped = localSubgraph(req.graph, req.from, req.radius);
    const graph = scoped.nodes.includes(req.to) ? scoped : req.graph;
    return shortestPath(graph, req.from, req.to);
  };
  const out = await call(OP.ROUTE, encodeRouteRequest(req));
  if (!out) return fallback();
  try {
    return decodeRouteResult(out);
  } catch {
    return fallback();
  }
}

/** Paket özeti (mükerrer filtresi) — 32 bit. */
export async function digestInWorker(bytes: Uint8Array): Promise<number> {
  const copy = new Uint8Array(bytes);
  const out = await call(OP.DIGEST, copy.buffer);
  if (out && out.byteLength >= 4) return new DataView(out).getUint32(0, true);
  let h = 2166136261;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type KernelWorkerInfo = {
  alive: boolean;
  wasm: boolean;
  abi: number;
  /** IPC protokol sürümü (2 = paylaşımlı halka destekli). */
  protocol: number;
  /** Paylaşımlı bellek taşıması etkin mi? */
  shared: boolean;
};

/** İşçi ve Wasm çekirdeği durumu (Ayarlar panelinde gösterilir). */
export async function kernelWorkerInfo(): Promise<KernelWorkerInfo> {
  const out = await call(OP.HELLO, new ArrayBuffer(0));
  if (!out || out.byteLength < 2)
    return { alive: false, wasm: false, abi: 0, protocol: 0, shared: false };
  const view = new DataView(out);
  return {
    alive: true,
    wasm: view.getUint8(0) === 1,
    abi: view.getUint8(1),
    protocol: out.byteLength >= 3 ? view.getUint8(2) : 1,
    shared: out.byteLength >= 4 ? view.getUint8(3) === 1 : false,
  };
}

/** Varsayılan yarıçapla rota isteği kurar. */
export function routeRequest(graph: RouteRequest["graph"], from: string, to: string): RouteRequest {
  return { graph, from, to, radius: transitConfig().hopRadius };
}

/** Test/kapanış: işçiyi serbest bırakır. */
export function disposeKernelWorker() {
  worker?.terminate();
  worker = null;
  ringOut = null;
  ringIn = null;
  pending.clear();
}
