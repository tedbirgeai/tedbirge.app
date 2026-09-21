/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM SÖZLÜK MATRİSİ (I18N)
 * ------------------------------------------------------------------
 * Çizim yüzeyindeki ve kartlardaki metinler JSON tabanlı sözlükten
 * okunur. Varsayılan dil Türkçe; eksik anahtar İngilizceye, o da yoksa
 * anahtarın kendisine düşer. CDN ya da harici çeviri servisi yoktur.
 */

export type LocaleId = "tr" | "en";

const DICT: Record<LocaleId, Record<string, string>> = {
  tr: {
    "kernel.title": "AXIOM ÇEKİRDEK",
    "kernel.phase": "Faz 2 — dil motoru ve değişmez eşleştirme etkin; kanıt üretilmez",
    "ram.fill": "Sanal RAM doluluğu",
    "lang.title": "Dil tanıma",
    "lang.human": "İnsan dili",
    "lang.code": "Kod / donanım dili",
    "lang.unknown": "Bilinmiyor",
    "lang.confidence": "Güven",
    "ast.title": "Yapı ağacı (ASK ASCII/1.0)",
    "ast.nodes": "Düğüm",
    "ast.depth": "Derinlik",
    "inv.title": "Değişmez eşleşmeleri",
    "inv.none": "Eşleşen değişmez yok.",
    "inv.related": "İlgili",
    "inv.conflict": "Çelişki şüphesi",
    "inv.ledger": "Kaynak defter",
    "node.title": "Ağ düğümü",
    "node.peers": "Bağlı cihaz",
    "node.free": "NODE_ACTIVE_FREE",
    "node.pro": "SUBSCRIPTION_REQUIRED",
    "science.title": "Bilim matrisi",
  },
  en: {
    "kernel.title": "AXIOM KERNEL",
    "kernel.phase": "Phase 2 — language and invariant matching active; no proofs produced",
    "ram.fill": "Virtual RAM usage",
    "lang.title": "Language detection",
    "lang.human": "Human language",
    "lang.code": "Code / hardware language",
    "lang.unknown": "Unknown",
    "lang.confidence": "Confidence",
    "ast.title": "Syntax tree (ASK ASCII/1.0)",
    "ast.nodes": "Nodes",
    "ast.depth": "Depth",
    "inv.title": "Invariant matches",
    "inv.none": "No invariant matched.",
    "inv.related": "Related",
    "inv.conflict": "Possible conflict",
    "inv.ledger": "Source registry",
    "node.title": "Mesh node",
    "node.peers": "Connected devices",
    "node.free": "NODE_ACTIVE_FREE",
    "node.pro": "SUBSCRIPTION_REQUIRED",
    "science.title": "Science matrix",
  },
};

let locale: LocaleId = "tr";

export function setAxiomLocale(next: LocaleId) {
  locale = next;
}

export function axiomLocale(): LocaleId {
  return locale;
}

/** Sözlükten metin okur; eksikse İngilizceye, o da yoksa anahtara düşer. */
export function t(key: string): string {
  return DICT[locale][key] ?? DICT.en[key] ?? key;
}
