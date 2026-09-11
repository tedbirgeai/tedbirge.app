/**
 * UYGULAMA VERİSİ İZOLASYONU (/appdata/{app_id})
 * ------------------------------------------------------------------
 * Her .tbapp paketi yalnız kendi alanına yazar. Alan, cihazda türetilen
 * bir ana anahtardan uygulama kimliğine özel olarak türetilmiş AES-GCM
 * anahtarıyla şifrelenir; bir uygulama diğerinin verisini çözemez.
 *
 * Depolama yüzeyi tarayıcı yerel deposudur; VFS'in genel API'si
 * (src/lib/vfs/store.ts) değiştirilmez, ayrı bir ad alanı kullanılır.
 */

const NS = "tedbirge.appdata";
const MASTER_KEY = "tedbirge.appdata.master";

export function appDataPath(appId: string, key: string): string {
  return `/appdata/${appId}/${key}`;
}

function storageKey(appId: string, key: string): string {
  return `${NS}:${appId}:${key}`;
}

/** Cihazda kalıcı ana gizli değer; yoksa üretilir. */
function masterSecret(): Uint8Array<ArrayBuffer> {
  let b64 = "";
  try {
    b64 = window.localStorage.getItem(MASTER_KEY) ?? "";
  } catch {
    b64 = "";
  }
  if (!b64) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    b64 = btoa(String.fromCharCode(...raw));
    try {
      window.localStorage.setItem(MASTER_KEY, b64);
    } catch {
      /* özel kip: oturum boyunca geçerli */
    }
  }
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

/** Uygulama kimliğine bağlı AES-GCM anahtarı türetir. */
function appKey(appId: string): Promise<CryptoKey> {
  const cached = keyCache.get(appId);
  if (cached) return cached;
  const promise = (async () => {
    const base = await crypto.subtle.importKey("raw", masterSecret(), "HKDF", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        hash: "SHA-256",
        salt: new TextEncoder().encode(`tedbirge/appdata/${appId}`),
        info: new TextEncoder().encode("aes-gcm"),
      },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();
  keyCache.set(appId, promise);
  return promise;
}

/** Uygulamanın kendi alanına şifreli yazar. */
export async function writeAppData(appId: string, key: string, value: string): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await appKey(appId),
      new TextEncoder().encode(value),
    ),
  );
  const packed = new Uint8Array(new ArrayBuffer(iv.length + cipher.length));
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  window.localStorage.setItem(storageKey(appId, key), btoa(String.fromCharCode(...packed)));
}

/** Uygulamanın kendi alanından okur; başka uygulamanın verisi çözülemez. */
export async function readAppData(appId: string, key: string): Promise<string | null> {
  const raw = window.localStorage.getItem(storageKey(appId, key));
  if (!raw) return null;
  try {
    const bin = atob(raw);
    const packed = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) packed[i] = bin.charCodeAt(i);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: packed.slice(0, 12) },
      await appKey(appId),
      packed.slice(12),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

/** Uygulamanın alanındaki anahtarları listeler. */
export function listAppData(appId: string): string[] {
  const prefix = `${NS}:${appId}:`;
  const out: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith(prefix)) out.push(k.slice(prefix.length));
  }
  return out;
}

/** Paket kaldırılınca alanı tamamen siler. */
export function clearAppData(appId: string): void {
  for (const key of listAppData(appId)) {
    window.localStorage.removeItem(storageKey(appId, key));
  }
  keyCache.delete(appId);
}
