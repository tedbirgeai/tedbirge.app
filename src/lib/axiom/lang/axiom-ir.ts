/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AXIOM-IR (ORTAK ARA GÖSTERİM)
 * ------------------------------------------------------------------
 * İnsan dili cümlesi de kod parçası da aynı ara gösterime indirgenir:
 * kavramlar, nicelikler (değer + birim), ilişkiler (işleçli üçlüler) ve
 * olumsuzlama. Değişmez eşleştirme katmanı yalnız bu gösterimi okur;
 * böylece her dil için ayrı kural yazılmaz.
 */

import type { Token } from "@/lib/axiom/lang/ask-ascii";

export type Quantity = { value: number; unit: string | null; raw: string };
export type Relation = { left: string; op: string; right: string };

export type AxiomIr = {
  /** Anlam taşıyan sözcükler (küçük harfe indirgenmiş, tekilleştirilmiş). */
  concepts: string[];
  quantities: Quantity[];
  relations: Relation[];
  /** Olumsuzlama var mı? (değil, not, no, yok…) */
  negated: boolean;
  /** Kod mu metin mi ayrımı için belirteç sayıları. */
  counts: { words: number; numbers: number; operators: number; comments: number };
};

/** Eşleştirmede gürültü yapan işlev sözcükleri. */
const STOP = new Set([
  "bir",
  "ve",
  "ile",
  "için",
  "olan",
  "olarak",
  "the",
  "and",
  "is",
  "of",
  "for",
  "with",
  "that",
  "a",
  "an",
  "to",
  "in",
]);

const NEGATIONS = new Set(["değil", "değildir", "yok", "asla", "not", "no", "never", "cannot"]);

/** Sık kullanılan bilim/mühendislik birimleri. */
const UNITS = [
  "j",
  "joule",
  "kj",
  "mj",
  "w",
  "watt",
  "kw",
  "mw",
  "kwh",
  "v",
  "volt",
  "a",
  "amper",
  "ah",
  "k",
  "kelvin",
  "c",
  "celsius",
  "m",
  "km",
  "cm",
  "mm",
  "s",
  "ms",
  "hz",
  "khz",
  "mhz",
  "ghz",
  "bit",
  "bps",
  "kbps",
  "mbps",
  "gbps",
  "byte",
  "kb",
  "mb",
  "gb",
  "pa",
  "bar",
  "n",
  "kg",
  "g",
  "mol",
  "%",
];

/** Belirteç akışını ara gösterime dönüştürür. */
export function toIr(tokens: Token[]): AxiomIr {
  const concepts: string[] = [];
  const quantities: Quantity[] = [];
  const relations: Relation[] = [];
  const counts = { words: 0, numbers: 0, operators: 0, comments: 0 };
  let negated = false;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.type === "comment") {
      counts.comments += 1;
      continue;
    }
    if (t.type === "operator") {
      counts.operators += 1;
      const left = tokens[i - 1];
      const right = tokens[i + 1];
      if (left && right && left.type !== "comment" && right.type !== "comment") {
        relations.push({ left: left.value, op: t.value, right: right.value });
      }
      continue;
    }
    if (t.type === "number") {
      counts.numbers += 1;
      const value = Number(t.value.replace(/_/g, ""));
      const next = tokens[i + 1];
      const unitRaw = next && (next.type === "word" || next.value === "%") ? next.value : null;
      const unit = unitRaw && UNITS.includes(unitRaw.toLowerCase()) ? unitRaw : null;
      quantities.push({
        value: Number.isFinite(value) ? value : Number.NaN,
        unit,
        raw: unit ? `${t.value} ${unit}` : t.value,
      });
      continue;
    }
    if (t.type === "word") {
      counts.words += 1;
      const lower = t.value.toLowerCase();
      if (NEGATIONS.has(lower)) negated = true;
      if (!STOP.has(lower) && lower.length > 1 && !concepts.includes(lower)) concepts.push(lower);
    }
  }

  return { concepts, quantities, relations, negated, counts };
}
