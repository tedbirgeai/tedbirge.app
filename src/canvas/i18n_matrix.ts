/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

export type Locale = "tr" | "en" | "de" | "ja" | "zh";

const DICTIONARY: Record<Locale, Record<string, string>> = {
  tr: {
    title: "AXIOM Kernel v12 — Sıfır Hata Hakikat Motoru",
    status_active: "SİSTEM AKTİF",
    mem_limit: "BELLEK SINIRI",
    proof_verified: "DOĞRULANDI",
    node_free: "P2P DÜĞÜM (SERBEST)",
  },
  en: {
    title: "AXIOM Kernel v12 — Zero-Error Truth Engine",
    status_active: "SYSTEM ACTIVE",
    mem_limit: "MEMORY LIMIT",
    proof_verified: "PROVEN",
    node_free: "P2P NODE (FREE)",
  },
  de: {
    title: "AXIOM Kernel v12 — Null-Fehler Wahrheitssystem",
    status_active: "SYSTEM AKTIV",
    mem_limit: "SPEICHERLIMIT",
    proof_verified: "BEWIESEN",
    node_free: "P2P KNOTEN (FREI)",
  },
  ja: {
    title: "AXIOM Kernel v12 — ゼロエラー真実エンジン",
    status_active: "システムアクティブ",
    mem_limit: "メモリ制限",
    proof_verified: "検証済み",
    node_free: "P2Pノード (無料)",
  },
  zh: {
    title: "AXIOM Kernel v12 — 零错误真理引擎",
    status_active: "系统激活",
    mem_limit: "内存限制",
    proof_verified: "已验证",
    node_free: "P2P节点 (免费)",
  },
};

export function translateCanvasText(key: string, locale: Locale = "tr"): string {
  return DICTIONARY[locale]?.[key] || DICTIONARY["en"]?.[key] || key;
}
