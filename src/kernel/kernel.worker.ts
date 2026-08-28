/**
 * ÇEKİRDEK İŞÇİSİ (kernel.worker.ts)
 * ------------------------------------------------------------------
 * Yönlendirme, özet (mükerrer paket filtresi) ve yetenek bildirimi ana
 * iş parçacığından çıkarılır. Tüm trafik `ipc.ts` ikili çerçevesiyle,
 * `Transferable ArrayBuffer` üzerinde taşınır — JSON kopyası yoktur.
 *
 * Wasm çekirdeği bulunabiliyorsa ağırlık/atlama hesabı ona devredilir;
 * bulunamazsa TypeScript motoru aynı sonucu üretir (sessiz düşüş).
 */

/// <reference lib="webworker" />

import { decodeFrame, encodeFrame, OP } from "@/kernel/ipc";
import { decodeRouteRequest, encodeRouteResult } from "@/kernel/route-codec";
import { localSubgraph, shortestPath } from "@/lib/mesh-routing";

type KernelExports = {
  abi_version: () => number;
  digest32?: (ptr: number, len: number) => number;
  /** Faz C: çekirdeğe taşınan Dijkstra. */
  route_solve?: (ptr: number, len: number) => number;
  kernel_alloc?: (len: number) => number;
  kernel_free?: (ptr: number, len: number) => void;
  memory?: WebAssembly.Memory;
};

let wasm: KernelExports | null = null;
let wasmTried = false;

async function ensureWasm(): Promise<KernelExports | null> {
  if (wasmTried) return wasm;
  wasmTried = true;
  try {
    const res = await fetch("/kernel/tedbirge_kernel.wasm");
    if (!res.ok) return null;
    const { instance } = await WebAssembly.instantiate(await res.arrayBuffer(), {});
    const ex = instance.exports as unknown as KernelExports;
    if (typeof ex.abi_version === "function" && ex.abi_version() === 1) wasm = ex;
  } catch {
    wasm = null;
  }
  return wasm;
}

/** FNV-1a 32 bit — Rust `digest32` ile aynı sonuç (yedek yol). */
function digestJs(bytes: Uint8Array): number {
  let h = 2166136261;
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function digest(bytes: Uint8Array): number {
  const mod = wasm;
  if (mod?.digest32 && mod.kernel_alloc && mod.kernel_free && mod.memory) {
    try {
      const ptr = mod.kernel_alloc(bytes.length);
      new Uint8Array(mod.memory.buffer, ptr, bytes.length).set(bytes);
      const out = mod.digest32(ptr, bytes.length) >>> 0;
      mod.kernel_free(ptr, bytes.length);
      return out;
    } catch {
      /* Wasm arızası: TS yoluna düş */
    }
  }
  return digestJs(bytes);
}

/**
 * Faz C — Rota hesabını Wasm çekirdeğine devreder.
 * Modül yoksa, ayırma başarısızsa veya çağrı çökerse `null` döner ve
 * çağıran taraf TypeScript motoruna düşer (davranış aynıdır).
 */
function routeViaWasm(request: ArrayBuffer): ArrayBuffer | null {
  const mod = wasm;
  if (!mod?.route_solve || !mod.kernel_alloc || !mod.kernel_free || !mod.memory) return null;
  const bytes = new Uint8Array(request);
  let inPtr = 0;
  try {
    inPtr = mod.kernel_alloc(bytes.length);
    if (!inPtr) return null;
    new Uint8Array(mod.memory.buffer, inPtr, bytes.length).set(bytes);
    const outPtr = mod.route_solve(inPtr, bytes.length);
    if (!outPtr) return null;
    const len = new DataView(mod.memory.buffer).getUint32(outPtr, true);
    const out = mod.memory.buffer.slice(outPtr + 4, outPtr + 4 + len);
    mod.kernel_free(outPtr, len + 4);
    return out;
  } catch {
    return null;
  } finally {
    if (inPtr) {
      try {
        mod.kernel_free(inPtr, bytes.length);
      } catch {
        /* yoksay */
      }
    }
  }
}

/* ---------------- Faz D: paylaşımlı halka tampon taşıması ---------------- */

let ringIn: SharedRing | null = null;
let ringOut: SharedRing | null = null;

function post(bytes: ArrayBuffer) {
  if (ringOut && ringOut.push(new Uint8Array(bytes))) return;
  (self as unknown as Worker).postMessage(bytes, [bytes]);
}

function reply(op: number, corrId: number, payload: ArrayBuffer) {
  post(encodeFrame(op, corrId, payload));
}

function handle(buf: ArrayBuffer) {
  const frame = decodeFrame(buf);
  if (!frame) return;

  if (frame.op === OP.HELLO) {
    void ensureWasm().then((mod) => {
      const out = new ArrayBuffer(4);
      const view = new DataView(out);
      view.setUint8(0, mod ? 1 : 0);
      view.setUint8(1, mod ? mod.abi_version() : 0);
      // Protokol sürümü ve etkin taşıma (0: postMessage, 1: paylaşımlı halka).
      view.setUint8(2, IPC_PROTOCOL_VERSION);
      view.setUint8(3, ringIn && ringOut ? 1 : 0);
      reply(OP.HELLO_RESULT, frame.corrId, out);
    });
    return;
  }

  if (frame.op === OP.DIGEST) {
    const value = digest(new Uint8Array(frame.payload));
    const out = new ArrayBuffer(4);
    new DataView(out).setUint32(0, value, true);
    reply(OP.DIGEST_RESULT, frame.corrId, out);
    return;
  }

  if (frame.op === OP.ROUTE) {
    // Önce Rust/Wasm çekirdeği; başarısızsa TypeScript motoru.
    const native = routeViaWasm(frame.payload);
    if (native) {
      reply(OP.ROUTE_RESULT, frame.corrId, native);
      return;
    }
    const req = decodeRouteRequest(frame.payload);
    // k-hop yerel mesh: yarıçap dışındaki düğümler DHT katmanına bırakılır.
    const scoped = localSubgraph(req.graph, req.from, req.radius);
    const graph = scoped.nodes.includes(req.to) ? scoped : req.graph;
    // Kenar kaliteleri ana iş parçacığında canlı ölçümle güncellendiği için
    // burada statik taşıyıcı maliyeti kullanılır (çift sayım olmasın).
    const route = shortestPath(graph, req.from, req.to, { metrics: false });
    reply(OP.ROUTE_RESULT, frame.corrId, encodeRouteResult(route));
    return;
  }
}

/** Halka tampon pompası — `Atomics.waitAsync` ile bloklamadan bekler. */
async function pump() {
  for (;;) {
    const ring = ringIn;
    if (!ring) return;
    let drained = false;
    for (;;) {
      const msg = ring.pop();
      if (!msg) break;
      drained = true;
      handle(msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength) as ArrayBuffer);
    }
    if (!drained) await ring.waitForData(50);
  }
}

self.onmessage = (e: MessageEvent<ArrayBuffer | RingInit>) => {
  const data = e.data;
  if (data && !(data instanceof ArrayBuffer) && (data as RingInit).t === "ring") {
    const init = data as RingInit;
    ringIn = SharedRing.attach(init.c2w);
    ringOut = SharedRing.attach(init.w2c);
    void pump();
    return;
  }
  handle(data as ArrayBuffer);
};

// İlk fırsatta Wasm'ı ısıt: ilk rota isteği gecikmesin.
void ensureWasm();

