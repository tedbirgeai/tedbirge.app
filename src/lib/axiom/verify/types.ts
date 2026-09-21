/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM DOĞRULAMA KATMANI — ORTAK TİPLER (FAZ 3)
 * ------------------------------------------------------------------
 * Doğrulama sonucu tek bir yapıda taşınır: motor kimliği, karar,
 * numaralı kanıt adımları, süre, içerik kimliği (CID) ve mühür.
 * Yapı Web Worker ve JSON-RPC sınırlarından geçtiği için yalnız
 * yapılandırılmış klonlanabilir alanlar içerir (RegExp, Map, fonksiyon yok).
 */

/** Bağlanabilen motorlar. `mock` = ikili bulunamadı, simülasyon yürüdü. */
export type EngineId = "z3" | "lean4" | "mock";

export type ProofStep = {
  index: number;
  /** Uygulanan kural/taktik adı (ör. "assert", "check-sat", "intro"). */
  rule: string;
  /** Tek satır insan okunur açıklama. Girdi metni buraya kopyalanmaz. */
  detail: string;
};

/**
 * Karar kodları. Emirdeki durum dizeleri birebir korunur; arayüz ve MCP
 * yanıtı aynı sözlüğü kullanır.
 */
export type VerifyVerdict =
  | "200_PROVEN"
  | "409_REFUTED"
  | "422_UNDECIDED"
  | "504_EXECUTION_TIMEOUT"
  | "500_PANIC";

export type VerifyResult = {
  engine: EngineId;
  /** Motor gerçek WASM ikilisi mi, simülasyon mu? */
  simulated: boolean;
  verdict: VerifyVerdict;
  steps: ProofStep[];
  /** Harcanan süre (ms, tam sayı). */
  ms: number;
  /** İçerik kimliği: metin + motor + karar üzerinden determinist. */
  cid: string;
  /** TEDBİRGE-WEBOS-ZKP mührü. Yalnız 200_PROVEN kararında doludur. */
  seal: string | null;
  /** Üretilen SMT-LIB 2 önermesi (kısaltılmış). */
  smt: string;
  /** Üretilen Lean 4 teorem iskeleti (kısaltılmış). */
  lean: string;
};

/** Sert zaman bütçesi: her doğrulama en çok bu kadar sürebilir. */
export const VERIFY_TIMEOUT_MS = 500;

/** Panik/zaman aşımı yollarında dışa verilebilen alanlar (sıfır günlük kuralı). */
export const SAFE_RESULT_KEYS = ["engine", "simulated", "verdict", "ms", "cid", "seal"] as const;
