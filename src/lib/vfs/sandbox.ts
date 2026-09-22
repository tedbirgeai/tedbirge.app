/**
 * UYGULAMA ALANI KAPISI (Sandbox)
 * ------------------------------------------------------------------
 * Uygulamalar yerel depoya doğrudan erişmez. Her uygulama kendi kimliğine
 * bağlı bir kapı alır; bu kapı tüm yolları `/appdata/{app_id}` ağacına
 * zorlar. Sistem alanı (`/system`, `/kernel`), proje kökü (`/repo`) veya
 * başka bir uygulamanın alanı için yapılan istek reddedilir.
 *
 * Kapı iki koşulu birlikte arar: uygulamaya verilmiş yetenek ve o istek
 * için üretilmiş tek kullanımlık yetki anahtarı. Veri, mevcut şifreli
 * uygulama alanında (src/lib/apps/appdata.ts) durur; depo API'si değişmez.
 */

import type { Capability } from "@/kernel/capabilities";
import { clearAppData, listAppData, readAppData, writeAppData } from "@/lib/apps/appdata";
import { normalizeTreePath } from "@/lib/vfs/tree";
import { consumeVfsToken, issueVfsToken, type VfsOp, type VfsToken } from "@/lib/vfs/tokens";

export const APPDATA_ROOT = "/appdata";

/** Hiçbir uygulamanın giremeyeceği kökler. */
export const PROTECTED_ROOTS = ["/system", "/kernel", "/repo", "/etc", "/boot"] as const;

export class VfsAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VfsAccessError";
  }
}

const ID_RE = /^[a-z0-9][a-z0-9.\-_]{2,63}$/i;

/** Uygulamanın kök dizini. */
export function appRoot(appId: string): string {
  if (!ID_RE.test(appId)) throw new VfsAccessError("Uygulama kimliği geçersiz.");
  return `${APPDATA_ROOT}/${appId}`;
}

/** Yolu tek biçime indirir: baştaki "/" korunur, "." ve ".." tasfiye edilir. */
export function normalizeVfsPath(path: string): string {
  return `/${normalizeTreePath(path)}`;
}

/**
 * İsteği uygulamanın alanına çözer. Alan dışına çıkan her yol (kaçış
 * denemeleri dâhil) hata ile döner.
 */
export function resolveAppPath(appId: string, path: string): string {
  const root = appRoot(appId);
  const raw = path.startsWith("/") ? path : `${root}/${path}`;
  const full = normalizeVfsPath(raw);
  for (const guard of PROTECTED_ROOTS) {
    if (full === guard || full.startsWith(`${guard}/`))
      throw new VfsAccessError(`Bu alan uygulamalara kapalı: ${guard}`);
  }
  if (full !== root && !full.startsWith(`${root}/`))
    throw new VfsAccessError("Uygulama yalnız kendi alanına erişebilir.");
  if (full === root) throw new VfsAccessError("Dosya adı eksik.");
  return full;
}

/** Yolun uygulama alanı içindeki anahtarı. */
function keyOf(appId: string, full: string): string {
  return full.slice(appRoot(appId).length + 1);
}

const NEEDED: Record<VfsOp, Capability> = {
  read: "files.read",
  write: "files.write",
  delete: "files.delete",
};

export type AppVfs = {
  /** Uygulamanın kök dizini (bilgi amaçlı). */
  root: string;
  /** Tek bir işlem için tek kullanımlık anahtar ister. */
  authorize: (op: VfsOp, path: string) => Promise<VfsToken>;
  read: (path: string, token: VfsToken) => Promise<string | null>;
  write: (path: string, value: string, token: VfsToken) => Promise<void>;
  remove: (path: string, token: VfsToken) => Promise<void>;
  /** Uygulamanın kendi alanındaki yollar. */
  list: () => string[];
  /** Uygulama kaldırılınca alanı tamamen siler. */
  wipe: () => void;
};

/**
 * Uygulamaya özel kapı. Yetenek listesi kullanıcının onayından gelir;
 * onaylanmayan işlem için anahtar hiç üretilmez.
 */
export function openAppVfs(appId: string, caps: readonly Capability[]): AppVfs {
  const root = appRoot(appId);
  const need = (op: VfsOp) => {
    if (!caps.includes(NEEDED[op]))
      throw new VfsAccessError(`"${appId}" uygulamasının bu dosya izni yok.`);
  };
  const gate = async (op: VfsOp, path: string, token: VfsToken) => {
    need(op);
    const full = resolveAppPath(appId, path);
    await consumeVfsToken(token, { appId, op, path: full });
    return keyOf(appId, full);
  };
  return {
    root,
    authorize: (op, path) => {
      need(op);
      return issueVfsToken(appId, op, resolveAppPath(appId, path));
    },
    read: async (path, token) => readAppData(appId, await gate("read", path, token)),
    write: async (path, value, token) => writeAppData(appId, await gate("write", path, token), value),
    remove: async (path, token) => {
      const key = await gate("delete", path, token);
      window.localStorage.removeItem(`tedbirge.appdata:${appId}:${key}`);
    },
    list: () => listAppData(appId).map((k) => `${root}/${k}`),
    wipe: () => clearAppData(appId),
  };
}
