/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * OUTBOUND HTTP — SSRF'e karşı sertleştirilmiş fetch sarmalayıcı.
 * Sıfır adres, tamsayı/sekizli IPv4 kısaltmaları, IPv4-eşlenmiş IPv6 ve
 * bulut metadata hedefleri dahil özel/loopback ağlara çıkışı reddeder.
 * Yönlendirme zinciri manuel takip edilir; her Location aynı kapıdan
 * yeniden geçirilir (en çok 3 adım). Gövde metni loglanmaz.
 */

import { recordCall } from "@/lib/gateway/registry";

const METADATA_HOSTS = new Set([
  "metadata",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
  "instance-data.ec2.internal",
]);

/** IPv4 özel/loopback/link-local/CGNAT/multicast/broadcast bloklarını 32-bit int üzerinden kontrol eder. */
function isPrivateIPv4Int(n: number): boolean {
  // 0.0.0.0/8
  if (n >>> 24 === 0) return true;
  // 10.0.0.0/8
  if (n >>> 24 === 10) return true;
  // 127.0.0.0/8
  if (n >>> 24 === 127) return true;
  // 169.254.0.0/16 (link-local + AWS/GCP metadata)
  if (n >>> 16 === ((169 << 8) | 254)) return true;
  // 172.16.0.0/12
  if (n >>> 20 === ((172 << 4) | 1)) return true;
  // 192.168.0.0/16
  if (n >>> 16 === ((192 << 8) | 168)) return true;
  // 100.64.0.0/10 CGNAT
  if (n >>> 22 === ((100 << 2) | 1)) return true;
  // 224.0.0.0/4 multicast
  if (n >>> 28 === 0xe) return true;
  // 240.0.0.0/4 reserved
  if (n >>> 28 >= 0xf) return true;
  return false;
}

/** Çeşitli IPv4 gösterimlerini (nokta, sekizli, tamsayı) 32-bit int'e çevirir. Ayrıştırılamazsa null. */
function parseIPv4Any(host: string): number | null {
  const parts = host.split(".");
  if (parts.length < 1 || parts.length > 4) return null;
  let value = 0;
  for (let i = 0; i < parts.length; i += 1) {
    const p = parts[i]!;
    if (!p.length) return null;
    let n: number;
    if (/^0[xX][0-9a-fA-F]+$/.test(p)) n = parseInt(p.slice(2), 16);
    else if (/^0[0-7]+$/.test(p)) n = parseInt(p.slice(1), 8);
    else if (/^\d+$/.test(p)) n = parseInt(p, 10);
    else return null;
    if (!Number.isFinite(n) || n < 0) return null;
    if (i === parts.length - 1) {
      const max = 2 ** (8 * (4 - parts.length + 1));
      if (n >= max) return null;
      value = (value * max + n) >>> 0;
    } else {
      if (n > 255) return null;
      value = ((value << 8) | n) >>> 0;
    }
  }
  return value >>> 0;
}

/** IPv6 içindeki IPv4-eşlenmiş adresi yakalar (::ffff:a.b.c.d veya ::ffff:xxxx:xxxx). */
function extractMappedIPv4(hostname: string): string | null {
  const h = hostname.toLowerCase();
  const m = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (m) return m[1]!;
  const hex = h.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hex) {
    const hi = parseInt(hex[1]!, 16);
    const lo = parseInt(hex[2]!, 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return null;
}

/** Ana makineyi denetler; blokluysa gerekçe döner, aksi halde null. */
export function classifyHost(rawHost: string): string | null {
  const stripped = rawHost.replace(/^\[|\]$/g, "").toLowerCase();
  if (!stripped) return "Boş ana makine";
  if (stripped === "localhost" || stripped.endsWith(".localhost")) return "Loopback";
  if (METADATA_HOSTS.has(stripped)) return "Bulut metadata hedefi";

  // IPv6 loopback / link-local / ULA
  if (stripped === "::1") return "IPv6 loopback";
  if (stripped.startsWith("fe80:")) return "IPv6 link-local";
  if (stripped.startsWith("fc") || stripped.startsWith("fd")) return "IPv6 özel ağ";

  const mapped = extractMappedIPv4(stripped);
  const candidate = mapped ?? stripped;
  const asInt = parseIPv4Any(candidate);
  if (asInt !== null) {
    if (isPrivateIPv4Int(asInt)) return "Özel/loopback IPv4";
  }
  return null;
}

export type OutboundOptions = RequestInit & {
  allowHttp?: boolean;
  timeoutMs?: number;
  maxRedirects?: number;
};

async function guardedOnce(
  slug: string,
  url: URL,
  init: RequestInit,
  allowHttp: boolean,
): Promise<Response> {
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    recordCall(slug, false);
    throw new Error("Yalnız https:// hedeflere izin verilir");
  }
  const reason = classifyHost(url.hostname);
  if (reason) {
    recordCall(slug, false);
    throw new Error(`Çıkış reddedildi: ${reason}`);
  }
  return fetch(url.toString(), init);
}

export async function outboundFetch(
  slug: string,
  input: string,
  opts: OutboundOptions = {},
): Promise<Response> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    recordCall(slug, false);
    throw new Error("Geçersiz URL");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  const maxRedirects = Math.max(0, opts.maxRedirects ?? 3);
  try {
    let current = url;
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
      const res = await guardedOnce(
        slug,
        current,
        { ...opts, redirect: "manual", signal: controller.signal },
        opts.allowHttp === true,
      );
      if (res.status >= 300 && res.status < 400 && res.headers.has("location")) {
        if (hop === maxRedirects) {
          recordCall(slug, false);
          throw new Error("Yönlendirme sınırı aşıldı");
        }
        current = new URL(res.headers.get("location")!, current);
        continue;
      }
      recordCall(slug, res.ok);
      return res;
    }
    recordCall(slug, false);
    throw new Error("Yönlendirme sınırı aşıldı");
  } catch (err) {
    recordCall(slug, false);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
