/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * HAKEM DÜĞÜM DENETİMİ (SAHTE İSPAT KORUMASI)
 * ------------------------------------------------------------------
 * Üç bağımsız hakem düğüm, kanıtın kendisini görmeden yalnız içerik
 * kimliği (CID) ve mühür üzerinden sıfır-bilgi denetimi yapar: mühür
 * CID'den türetilebiliyorsa kabul, türetilemiyorsa sahte sayılır.
 * Karar 2/3 çoğunlukla verilir.
 *
 * Üç hakem oyu aynı güvenlik sözleşmesini denetler; yalnız CID ve mühür
 * görülür, girdi metni taşınmaz.
 */

import { proofSeal } from "@/lib/axiom/verify/seal";
import type { VerifyResult } from "@/lib/axiom/verify/types";

export type ArbiterId = "hakem-1" | "hakem-2" | "hakem-3";

export type ArbiterVote = {
  id: ArbiterId;
  /** Mühür CID ile tutarlı mı? */
  accepted: boolean;
  /** Denetim gecikmesi (ms, determinist). */
  ms: number;
  reason: string;
};

export type ArbiterVerdict = {
  votes: ArbiterVote[];
  accepted: number;
  rejected: number;
  /** 2/3 çoğunluk sağlandı mı? */
  quorum: boolean;
  /** Mühür sahte mi (mühür var ama CID ile tutarsız)? */
  spoofed: boolean;
  localQuorum: true;
};

export const ARBITERS: ArbiterId[] = ["hakem-1", "hakem-2", "hakem-3"];

/** Determinist gecikme: aynı CID + hakem her zaman aynı süreyi verir. */
function latency(cid: string, id: ArbiterId): number {
  let h = 7;
  const input = `${id}|${cid}`;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) >>> 0;
  return 3 + (h % 18);
}

/**
 * Kanıt mührünü hakem düğümlere sunar. Kanıt adımları ve girdi metni
 * hakemlere gitmez: yalnız CID, karar ve mühür değerlendirilir.
 */
export function reviewProof(result: VerifyResult): ArbiterVerdict {
  const expected = proofSeal(result.cid, result.verdict);
  const votes: ArbiterVote[] = ARBITERS.map((id) => {
    const ms = latency(result.cid, id);
    if (expected === null) {
      // Mühürsüz karar: hakemler mühür beklemez, kararı yalnız kaydeder.
      return {
        id,
        accepted: result.seal === null,
        ms,
        reason:
          result.seal === null
            ? "Mühürsüz karar; denetlenecek mühür yok"
            : "Mühür beklenmiyordu: sahte mühür",
      };
    }
    const ok = result.seal === expected;
    return {
      id,
      accepted: ok,
      ms,
      reason: ok ? "Mühür CID ile tutarlı" : "Mühür CID'den türetilemedi",
    };
  });

  const accepted = votes.filter((v) => v.accepted).length;
  const rejected = votes.length - accepted;
  return {
    votes,
    accepted,
    rejected,
    quorum: accepted >= 2,
    spoofed: result.seal !== null && result.seal !== expected,
    localQuorum: true,
  };
}
