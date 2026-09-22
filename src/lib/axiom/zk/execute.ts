/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * SIFIR BİLGİ KANIT UYGULAMA KATMANI (FAZ 3)
 * ------------------------------------------------------------------
 * Bir durum geçişi doğrulanırken yalnız geçiş türü ve gövde özeti
 * taşınır; alan değerleri, kullanıcı metni ve gizli veri hiçbir yere
 * kopyalanmaz. Karar AXIOM çekirdeğinin hükmüdür: kanıtlandıysa geçiş
 * zincire işlenir, çelişkili veya kararsızsa durum değişmez.
 */

import { fnv1a64 } from "@/lib/axiom/verify/seal";
import type { VerifyResult } from "@/lib/axiom/verify/types";
import { getChain, recordTransition, type AppendResult } from "@/lib/axiom/zk/state-chain";

/** Gövde özeti: ham alanlar değil, sabit uzunlukta özet üretir. */
export function payloadDigest(fields: Record<string, string | number | boolean | null>): string {
  // Anahtarlar sıralanır: aynı içerik her zaman aynı özeti verir.
  const canonical = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${String(fields[key])}`)
    .join("\u001f");
  return `zk:${fnv1a64(canonical)}`;
}

/**
 * Doğrulama sonucunu durum geçişine çevirir.
 * Mühür yoksa (canlı motor yoksa, kararsız veya çelişkili) zincir dokunulmaz.
 */
export function recordVerifiedTransition(
  kind: string,
  digest: string,
  result: VerifyResult,
): AppendResult {
  return recordTransition({
    kind,
    payloadDigest: digest,
    verdict: result.verdict,
    seal: result.seal,
    ms: result.ms,
    expectedPreviousRoot: getChain().root,
  });
}
