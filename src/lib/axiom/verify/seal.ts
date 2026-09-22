/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * İÇERİK KİMLİĞİ (CID) VE ZKP MÜHRÜ
 * ------------------------------------------------------------------
 * CID; girdi metni, motor kimliği ve karar üzerinden determinist olarak
 * türetilir (aynı girdi → aynı CID). Ham metin hiçbir yere yazılmaz,
 * yalnız özeti taşınır. Mühür yalnız 200_PROVEN kararında üretilir.
 */

import type { EngineId, VerifyVerdict } from "@/lib/axiom/verify/types";

/** 64-bit FNV-1a türevi; kriptografik değildir, içerik adresleme içindir. */
export function fnv1a64(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = (h1 ^ c) >>> 0;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = (h2 + c * (i + 1)) >>> 0;
    h2 = (h2 ^ (h2 << 5)) >>> 0;
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

export function contentId(text: string, engine: EngineId, verdict: VerifyVerdict): string {
  return `cid:axiom:${fnv1a64(`${engine}|${verdict}|${text.length}|${text}`)}`;
}

export const SEAL_PREFIX = "TEDBİRGE-WEBOS-ZKP";

/** Mühür dizesi; yalnız kanıtlanmış kararlarda döner. */
export function proofSeal(cid: string, verdict: VerifyVerdict): string | null {
  if (verdict !== "200_PROVEN") return null;
  return `${SEAL_PREFIX}:${cid.slice(-16)}`;
}
