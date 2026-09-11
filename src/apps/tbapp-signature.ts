/**
 * .tbapp İMZA DOĞRULAMASI (Ed25519)
 * ------------------------------------------------------------------
 * Paket manifestinin imzasız gövdesi kanonik JSON'a çevrilir ve paketin
 * bildirdiği doğrulama anahtarıyla denetlenir. İmzasız paketler yalnız
 * kullanıcının açık "geliştirici modu" onayıyla kurulabilir ve masaüstü
 * simgesinde "doğrulanmamış" rozeti taşır.
 */

export type SignatureState = "verified" | "unsigned" | "invalid" | "unsupported";

/** Anahtarları sıralayan kararlı (kanonik) JSON serileştirme. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => k !== "sig" && obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(",")}}`;
}

function fromBase64(text: string): Uint8Array {
  const norm = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm.padEnd(Math.ceil(norm.length / 4) * 4, "="));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * İmzayı denetler.
 * - "verified": imza geçerli.
 * - "unsigned": pakette imza/anahtar yok (geliştirici modu gerekir).
 * - "invalid": imza var ama tutmuyor — paket kurulmaz.
 * - "unsupported": tarayıcı Ed25519 desteklemiyor; paket doğrulanamadı.
 */
export async function verifyTbAppSignature(manifest: {
  spk?: string;
  sig?: string;
  [k: string]: unknown;
}): Promise<SignatureState> {
  const { spk, sig } = manifest;
  if (!spk || !sig) return "unsigned";
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return "unsupported";
  try {
    const key = await subtle.importKey("raw", fromBase64(spk), { name: "Ed25519" }, false, [
      "verify",
    ]);
    const body = new TextEncoder().encode(canonicalJson(manifest));
    const ok = await subtle.verify("Ed25519", key, fromBase64(sig), body);
    return ok ? "verified" : "invalid";
  } catch {
    return "unsupported";
  }
}

/** Kullanıcıya gösterilecek kısa Türkçe rozet metni. */
export function signatureLabel(state: SignatureState): string {
  if (state === "verified") return "Doğrulanmış paket";
  if (state === "invalid") return "İmza geçersiz";
  if (state === "unsupported") return "İmza doğrulanamadı";
  return "Doğrulanmamış paket";
}
