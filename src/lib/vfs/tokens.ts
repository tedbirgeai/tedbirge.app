/**
 * TEK KULLANIMLIK YETKİ ANAHTARLARI (Capability Tokens)
 * ------------------------------------------------------------------
 * Dosya alanına yapılan her işlem, klasik rwx bitleri yerine kapsamı
 * daraltılmış tek kullanımlık bir oturum anahtarıyla yapılır. Anahtar
 * yalnız şu dördünü birlikte taşır: uygulama kimliği, işlem türü, izinli
 * yol öneki ve son kullanma anı. Mühür oturum içinde üretilen gizli
 * değerle atılır; cihazda kalıcı kopyası yoktur ve ağa hiçbir şey çıkmaz.
 *
 * Anahtar bir kez harcanır: aynı anahtarla ikinci istek reddedilir
 * (tekrar oynatma koruması).
 */

export type VfsOp = "read" | "write" | "delete";

export type VfsToken = {
  appId: string;
  op: VfsOp;
  /** İzinli yol öneki — anahtar yalnız bu ağacın altında geçerlidir. */
  prefix: string;
  /** Son kullanma anı (epoch ms). */
  exp: number;
  /** Tekrar oynatmayı engelleyen benzersiz değer. */
  nonce: string;
  /** Kapsamın mührü. */
  mac: string;
};

export class VfsTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VfsTokenError";
  }
}

/** Varsayılan ömür — bir kullanıcı etkileşimi için fazlasıyla yeterli. */
export const TOKEN_TTL_MS = 5_000;

/** Aynı anda bellekte tutulan harcanmış anahtar sayısı tavanı. */
const SPENT_LIMIT = 4_096;

let sessionKey: Promise<CryptoKey> | null = null;

/** Oturum gizli değeri — yalnız bellekte yaşar, yeniden başlatmada yenilenir. */
function key(): Promise<CryptoKey> {
  if (!sessionKey) {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    sessionKey = crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, [
      "sign",
      "verify",
    ]);
  }
  return sessionKey;
}

/** Test/çıkış yolu: oturum gizli değerini düşürür, tüm anahtarlar geçersizleşir. */
export function resetTokenSession(): void {
  sessionKey = null;
  spent.clear();
}

const spent = new Set<string>();

function scope(t: Omit<VfsToken, "mac">): string {
  return [t.appId, t.op, t.prefix, String(t.exp), t.nonce].join("\u0000");
}

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function seal(t: Omit<VfsToken, "mac">): Promise<string> {
  const sig = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(scope(t)));
  return hex(sig);
}

/** Verilen kapsam için tek kullanımlık anahtar üretir. */
export async function issueVfsToken(
  appId: string,
  op: VfsOp,
  prefix: string,
  ttlMs = TOKEN_TTL_MS,
): Promise<VfsToken> {
  const body: Omit<VfsToken, "mac"> = {
    appId,
    op,
    prefix,
    exp: Date.now() + Math.max(1, ttlMs),
    nonce: hex(crypto.getRandomValues(new Uint8Array(12)).buffer),
  };
  return { ...body, mac: await seal(body) };
}

/** Sabit süreli karşılaştırma — mühür sızdırmaz. */
function equal(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Anahtarı harcar. Mühür, süre, kapsam ve tekrar kullanım denetimlerinden
 * biri bile geçmezse istek sessizce yutulmaz, hata fırlatılır.
 */
export async function consumeVfsToken(
  token: VfsToken,
  need: { appId: string; op: VfsOp; path: string },
): Promise<void> {
  const { mac, ...body } = token;
  if (!equal(mac, await seal(body))) throw new VfsTokenError("Yetki anahtarının mührü geçersiz.");
  if (spent.has(mac)) throw new VfsTokenError("Bu yetki anahtarı daha önce kullanıldı.");
  if (token.exp <= Date.now()) throw new VfsTokenError("Yetki anahtarının süresi doldu.");
  if (token.appId !== need.appId) throw new VfsTokenError("Yetki anahtarı başka bir uygulamaya ait.");
  if (token.op !== need.op) throw new VfsTokenError("Yetki anahtarı bu işlem için verilmedi.");
  if (need.path !== token.prefix && !need.path.startsWith(`${token.prefix}/`))
    throw new VfsTokenError("Yetki anahtarı bu yolu kapsamıyor.");
  if (spent.size >= SPENT_LIMIT) spent.clear();
  spent.add(mac);
}
