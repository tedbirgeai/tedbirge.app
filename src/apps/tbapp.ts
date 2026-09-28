/**
 * .tbapp YÜKLEYİCİ (Wasm uygulama paketi)
 * ------------------------------------------------------------------
 * Faz C: kabuk, dışarıdan gelen bir uygulama paketini okur, bildirdiği
 * yetenekleri kullanıcıya sorar ve onaylandıysa Wasm modülünü yalnız o
 * yeteneklerle sınırlı bir çekirdek vekiliyle çalıştırır.
 *
 * Paket biçimi (JSON, uzantı .tbapp):
 * {
 *   "id": "ornek.sayac",
 *   "name": "Sayaç",
 *   "version": "1.0.0",
 *   "capabilities": ["status.read"],
 *   "module": "data:application/wasm;base64,..."   // veya "/wasm/x.wasm"
 * }
 *
 * İmzasız paketler çalışır (geliştirici modu kararı), ancak yetenek
 * onayı zorunludur ve her paket kendi sanal kutusundadır.
 */

import { ALL_CAPABILITIES, type Capability } from "@/kernel/capabilities";
import { grantKernel } from "@/kernel/capabilities";
import type { Kernel } from "@/kernel/contract";
import { registerApp, type AppManifest } from "@/apps/registry";
import { verifyTbAppSignature, type SignatureState } from "@/apps/tbapp-signature";
import { clearAppData } from "@/lib/apps/appdata";

export type TbAppManifest = {
  id: string;
  name: string;
  version: string;
  capabilities: Capability[];
  module: string;
  description?: string;
  /** Faz D: paketi imzalayanın doğrulama anahtarı (varsa). */
  spk?: string;
  /** Faz D: paket imzası (varsa). */
  sig?: string;
  /** Kurulum sırasında saptanan imza durumu. */
  signature?: SignatureState;
};

export class TbAppError extends Error {}

/** Paket metnini doğrular; hatalar sade Türkçe anlatılır. */
export function parseTbApp(text: string): TbAppManifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new TbAppError("Paket okunamadı: geçerli bir .tbapp dosyası değil.");
  }
  const m = raw as Partial<TbAppManifest>;
  if (!m || typeof m.id !== "string" || !/^[a-z0-9][a-z0-9.\-_]{2,63}$/i.test(m.id))
    throw new TbAppError("Paket kimliği geçersiz.");
  if (typeof m.name !== "string" || !m.name.trim()) throw new TbAppError("Paket adı eksik.");
  if (typeof m.version !== "string" || !m.version.trim())
    throw new TbAppError("Paket sürümü eksik.");
  if (typeof m.module !== "string" || !m.module.trim())
    throw new TbAppError("Paket içinde çalıştırılacak modül yok.");
  const caps = Array.isArray(m.capabilities) ? m.capabilities : [];
  const unknown = caps.filter((c) => !ALL_CAPABILITIES.includes(c as Capability));
  if (unknown.length) throw new TbAppError(`Tanınmayan yetki isteği: ${unknown.join(", ")}`);
  return {
    id: m.id,
    name: m.name.trim(),
    version: m.version.trim(),
    capabilities: caps as Capability[],
    module: m.module,
    ...(m.description ? { description: String(m.description) } : {}),
    ...(typeof m.spk === "string" ? { spk: m.spk } : {}),
    ...(typeof m.sig === "string" ? { sig: m.sig } : {}),
  };
}

export async function readTbAppFile(file: File): Promise<TbAppManifest> {
  return parseTbApp(await file.text());
}

/** Yüklenen paketleri cihazda saklar (yalnız manifest; kod yeniden indirilir). */
const STORE_KEY = "tedbirge.shell.tbapps";

export function installedTbApps(): TbAppManifest[] {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as TbAppManifest[]) : [];
  } catch {
    return [];
  }
}

function persist(list: TbAppManifest[]) {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(list));
  } catch {
    /* private mode */
  }
}

/**
 * Paketi kurar. İmzası geçersiz paket asla kurulmaz; imzasız paket yalnız
 * `gelistirmeModu` açıkça onaylandığında kurulur ve "doğrulanmamış" olarak
 * işaretlenir.
 */
export async function installTbApp(
  m: TbAppManifest,
  gelistirmeModu = false,
): Promise<TbAppManifest> {
  const signature = await verifyTbAppSignature(m);
  if (signature === "invalid") throw new TbAppError("Paket imzası geçersiz — kurulum durduruldu.");
  if (signature !== "verified" && !gelistirmeModu)
    throw new TbAppError("Paket imzasız. Kurmak için geliştirici modunu onaylamanız gerekir.");
  const kayit: TbAppManifest = { ...m, signature };
  const list = installedTbApps().filter((x) => x.id !== m.id);
  list.push(kayit);
  persist(list);
  registerApp(toShellApp(kayit, list.length));
  return kayit;
}

/**
 * Kurulum akışı: imzasız paket için kullanıcıdan açık geliştirici modu
 * onayı alınır. Onay verilmezse paket kurulmaz.
 */
export async function installTbAppWithConsent(
  m: TbAppManifest,
  onay: (durum: SignatureState) => boolean | Promise<boolean>,
): Promise<TbAppManifest> {
  const signature = await verifyTbAppSignature(m);
  if (signature === "invalid") throw new TbAppError("Paket imzası geçersiz — kurulum durduruldu.");
  if (signature !== "verified") {
    const kabul = await onay(signature);
    if (!kabul) throw new TbAppError("Doğrulanmamış paket kurulmadı.");
  }
  return installTbApp(m, true);
}

export function uninstallTbApp(id: string) {
  persist(installedTbApps().filter((x) => x.id !== id));
  // Uygulamanın şifreli özel alanı da silinir.
  clearAppData(id);
}

function toShellApp(m: TbAppManifest, order: number): AppManifest {
  return {
    id: m.id,
    label: m.name,
    mobileOrder: 100 + order,
    railOrder: null,
    kind: "wasm",
    capabilities: m.capabilities,
    moduleUrl: m.module,
  };
}

/** Açılışta daha önce yüklenmiş paketleri kayda geri koyar. */
export function restoreInstalledTbApps() {
  installedTbApps().forEach((m, i) => registerApp(toShellApp(m, i)));
}

export type TbAppInstance = {
  manifest: TbAppManifest;
  exports: WebAssembly.Exports;
  dispose: () => void;
};

/**
 * Modülü, yalnız onaylanmış yeteneklerle sınırlı bir köprüyle başlatır.
 * Wasm tarafına verilen tek yüzey `tedbirge` içe aktarma nesnesidir;
 * doğrudan DOM, ağ veya depolama erişimi yoktur.
 */
const DATA_WASM = "data:application/wasm;base64,";

/** Gömülü (data:) modüller ağ isteği olmadan çözülür; diğerleri indirilir. */
export async function loadModuleBytes(module: string): Promise<ArrayBuffer> {
  if (module.startsWith(DATA_WASM)) {
    const bin = atob(module.slice(DATA_WASM.length));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  const res = await fetch(module);
  if (!res.ok) throw new TbAppError(`Modül indirilemedi (HTTP ${res.status}).`);
  return res.arrayBuffer();
}

export const LOG_MAX_BYTES = 1024;
export const LOG_MAX_PER_SEC = 50;

/** Paket günlüğü: en fazla 1 KB/satır, saniyede en fazla 50 satır. */
export function createLogSink(emit: (line: string) => void, now: () => number = Date.now) {
  let windowStart = 0;
  let count = 0;
  let dropped = 0;
  return {
    write(bytes: Uint8Array) {
      const t = now();
      if (t - windowStart >= 1000) {
        if (dropped) emit(`… ${dropped} satır hız sınırıyla atlandı`);
        windowStart = t;
        count = 0;
        dropped = 0;
      }
      if (count >= LOG_MAX_PER_SEC) {
        dropped += 1;
        return;
      }
      count += 1;
      const cut = bytes.subarray(0, LOG_MAX_BYTES);
      emit(new TextDecoder().decode(cut) + (bytes.length > LOG_MAX_BYTES ? "…" : ""));
    },
  };
}

export async function instantiateTbApp(
  m: TbAppManifest,
  granted: readonly Capability[],
  onLog?: (line: string) => void,
): Promise<TbAppInstance> {
  const kernel: Kernel = grantKernel(m.id, granted);
  const bytes = await loadModuleBytes(m.module);

  const host = {
    status_online: () => (kernel.status().online ? 1 : 0),
    status_peers: () => kernel.status().peers,
    log: (ptr: number, len: number) => {
      const mem = instance?.exports["memory"];
      if (!(mem instanceof WebAssembly.Memory) || ptr < 0 || len < 0) return;
      const end = Math.min(mem.buffer.byteLength, ptr + Math.min(len, LOG_MAX_BYTES + 1));
      if (ptr >= end) return;
      sink.write(new Uint8Array(mem.buffer.slice(ptr, end)));
    },
  };
  const sink = createLogSink(onLog ?? (() => {}));
  let instance: WebAssembly.Instance | undefined;

  ({ instance } = await WebAssembly.instantiate(bytes, { tedbirge: host }));
  let disposed = false;
  return {
    manifest: m,
    exports: instance.exports,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      const stop = instance.exports["stop"];
      if (typeof stop === "function") (stop as () => void)();
    },
  };
}
