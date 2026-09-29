/**
 * ÜRETİLEN UYGULAMA İŞÇİSİ
 * ------------------------------------------------------------------
 * Üretilen/.tbapp Wasm modülleri yalnız burada çalışır. Ana iş parçacığı
 * her çağrıya 1500 ms süre tanır; aşılırsa bu işçi `terminate()` ile
 * sonlandırılır. İşçinin ağ, depolama veya DOM köprüsü yoktur: çekirdek
 * durumu (çevrimiçi/eş sayısı) her çağrıyla birlikte ana taraftan gelir.
 */

/// <reference lib="webworker" />

import type { RuntimeIn, RuntimeOut } from "@/lib/studio/app-runtime-protocol";

const LOG_MAX_BYTES = 1024;
const LOG_MAX_PER_SEC = 50;

let exports: WebAssembly.Exports | null = null;
let status = { online: false, peers: 0 };
let windowStart = 0;
let count = 0;

function send(msg: RuntimeOut) {
  (self as unknown as Worker).postMessage(msg);
}

function writeLog(ptr: number, len: number) {
  const mem = exports?.["memory"];
  if (!(mem instanceof WebAssembly.Memory) || ptr < 0 || len < 0) return;
  const t = Date.now();
  if (t - windowStart >= 1000) {
    windowStart = t;
    count = 0;
  }
  if (count >= LOG_MAX_PER_SEC) return;
  count += 1;
  const end = Math.min(mem.buffer.byteLength, ptr + Math.min(len, LOG_MAX_BYTES));
  if (ptr >= end) return;
  send({ t: "log", line: new TextDecoder().decode(new Uint8Array(mem.buffer.slice(ptr, end))) });
}

const DATA_WASM = "data:application/wasm;base64,";

function decode(module: string): ArrayBuffer {
  if (!module.startsWith(DATA_WASM)) throw new Error("Yalnız gömülü çekirdek modülleri çalıştırılabilir.");
  const bin = atob(module.slice(DATA_WASM.length));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function describe(err: unknown): string {
  if (err instanceof WebAssembly.RuntimeError) return "Çekirdek çalışırken bir çalışma zamanı hatası oluştu.";
  if (err instanceof WebAssembly.LinkError) return "Çekirdek, izin verilmeyen bir sistem işlevi istedi.";
  if (err instanceof WebAssembly.CompileError) return "Çekirdek modülü bozuk veya geçersiz.";
  if (err instanceof Error && err.message.startsWith("Yalnız")) return err.message;
  return "Çekirdekte beklenmeyen bir hata oluştu.";
}

self.onmessage = async (e: MessageEvent<RuntimeIn>) => {
  const msg = e.data;
  if (msg.t === "init") {
    try {
      status = msg.status;
      const host = {
        status_online: () => (status.online ? 1 : 0),
        status_peers: () => status.peers,
        log: writeLog,
      };
      const env = {
        abort: () => {
          throw new WebAssembly.RuntimeError("abort");
        },
      };
      const { instance } = await WebAssembly.instantiate(decode(msg.module), { tedbirge: host, env });
      exports = instance.exports;
      send({ t: "ready" });
    } catch (err) {
      send({ t: "error", id: 0, reason: "load", message: describe(err) });
    }
    return;
  }
  if (msg.t === "call") {
    status = msg.status;
    const fn = exports?.[msg.fn];
    if (typeof fn !== "function") {
      send({ t: "result", id: msg.id, value: null });
      return;
    }
    try {
      const value = (fn as (...a: number[]) => unknown)(...msg.args);
      send({ t: "result", id: msg.id, value: typeof value === "number" ? value : null });
    } catch (err) {
      send({ t: "error", id: msg.id, reason: "crash", message: describe(err) });
    }
  }
};
