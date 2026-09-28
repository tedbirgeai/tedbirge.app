/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 *
 * OUTBOUND HTTP — SSRF'e karşı sertleştirilmiş fetch sarmalayıcı.
 * Yalnız https:// (ve izin verilmişse http://) hedefler; özel/loopback
 * IP bloklarına çıkışı reddeder. Gövde ve süre metrikleri Ağ Geçidi
 * registry'sine yazılır; gövde metni loglanmaz.
 */

import { recordCall } from "@/lib/gateway/registry";

const PRIVATE_HOST = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

export type OutboundOptions = RequestInit & {
  allowHttp?: boolean;
  timeoutMs?: number;
  maxBodyBytes?: number;
};

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
  if (url.protocol !== "https:" && !(opts.allowHttp && url.protocol === "http:")) {
    recordCall(slug, false);
    throw new Error("Yalnız https:// hedeflere izin verilir");
  }
  if (PRIVATE_HOST.some((r) => r.test(url.hostname))) {
    recordCall(slug, false);
    throw new Error("Özel/loopback ağa çıkış reddedildi");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(url.toString(), { ...opts, signal: controller.signal });
    recordCall(slug, res.ok);
    return res;
  } catch (err) {
    recordCall(slug, false);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
