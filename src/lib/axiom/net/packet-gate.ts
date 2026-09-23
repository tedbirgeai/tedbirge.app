/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AĞ SEVİYESİ DEĞİŞMEZ KAPISI
 * ------------------------------------------------------------------
 * Ağdan gelen hiçbir paket, fiziksel değişmez ve birim boyut denetiminden
 * geçmeden dosya sistemine ya da durum zincirine yazılamaz. Termodinamik,
 * momentum, ışık hızı sınırı gibi bir değişmezi ihlal eden ya da birim
 * boyutu uyuşmayan paket ağ katmanında sessizce imha edilir.
 *
 * Paketin gövdesi hiçbir yere kaydedilmez; yalnız karar ve kısa gerekçe
 * anahtarı döner.
 */

import { matchInvariants } from "@/lib/axiom/invariants";
import { askAscii } from "@/lib/axiom/lang/ask-ascii";
import { toIr } from "@/lib/axiom/lang/axiom-ir";
import { dimensionMismatch } from "@/lib/axiom/units";

export type GateDecision = {
  accepted: boolean;
  /** Türkçe, jargonsuz kısa gerekçe. */
  reason: string;
  /** Makine tarafı kod — günlüğe girdi metni yazılmaz. */
  code: "OK" | "BOS_PAKET" | "BOYUT_UYUSMAZ" | "DEGISMEZ_IHLALI";
};

const OK: GateDecision = { accepted: true, reason: "Paket kabul edildi.", code: "OK" };

/** İddia taşımayan paketler (yalnız saat/özet) doğrudan geçer. */
export function gatePacketClaim(claim: string | null | undefined): GateDecision {
  if (!claim || !claim.trim()) return OK;
  if (claim.length > 4096) {
    return { accepted: false, reason: "Paket fazla büyük, kabul edilmedi.", code: "BOS_PAKET" };
  }
  const { tokens } = askAscii(claim);
  const ir = toIr(tokens);
  if (dimensionMismatch(ir, claim)) {
    return {
      accepted: false,
      reason: "Paketteki ölçü birimleri birbirine uymuyor.",
      code: "BOYUT_UYUSMAZ",
    };
  }
  const matches = matchInvariants(ir, claim);
  if (matches.some((m) => m.verdict === "celiski")) {
    return {
      accepted: false,
      reason: "Paket doğa yasalarıyla çelişiyor.",
      code: "DEGISMEZ_IHLALI",
    };
  }
  return OK;
}
