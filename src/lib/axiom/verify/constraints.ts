/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * AST TABANLI ÇELİŞKİ MOTORU
 * ------------------------------------------------------------------
 * ASK ASCII belirteç/ağaç çıktısından kısıt düğümleri çıkarır ve kapalı
 * çelişkileri (literal eşitsizlik, boş aralık, p ∧ ¬p) türetir. Metin
 * anahtar kelime listesi kullanılmaz. Çelişki bulunamazsa `null` döner;
 * bu hiçbir zaman "kanıtlandı" anlamına gelmez.
 */

import { askAscii, type AstNode, type Token } from "@/lib/axiom/lang/ask-ascii";

export type Contradiction =
  | { kind: "literal"; detail: string }
  | { kind: "range"; detail: string }
  | { kind: "propositional"; detail: string };

/** Mantık sembollerini ASCII eşdeğerine indirger. */
export function normalizeLogic(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/≠/g, " != ")
    .replace(/≤/g, " <= ")
    .replace(/≥/g, " >= ")
    .replace(/[∧⋀]/g, " & ")
    .replace(/[∨⋁]/g, " | ")
    .replace(/[¬~]/g, " __not__ ")
    .replace(/\b(and|ve)\b/gi, " & ")
    .replace(/\b(or|veya)\b/gi, " | ")
    .replace(/\b(not|değil)\b/gi, " __not__ ");
}

type Atom = { value: string; kind: "number" | "bool" | "var" | "neg" };

function atomOf(t: Token | undefined): Atom | null {
  if (!t) return null;
  if (t.type === "number") return { value: t.value, kind: "number" };
  if (t.type === "word") {
    const v = t.value.toLowerCase();
    if (v === "true" || v === "false" || v === "doğru" || v === "yanlış")
      return { value: v === "doğru" ? "true" : v === "yanlış" ? "false" : v, kind: "bool" };
    return { value: t.value, kind: "var" };
  }
  return null;
}

/** Bir bölümün belirteçlerini `&` bağlacıyla konjunkt listelerine ayırır. */
function conjuncts(tokens: Token[]): Token[][] {
  const out: Token[][] = [[]];
  for (const t of tokens) {
    if (t.type === "comment" || t.type === "string") continue;
    if (t.type === "operator" && t.value === "&") {
      out.push([]);
      continue;
    }
    if (t.type === "open" || t.type === "close") continue;
    out[out.length - 1].push(t);
  }
  return out.filter((c) => c.length > 0);
}

/** Bir veya daha fazla `!` önekini sayarak olumsuzluğu çözer (çift olumsuzlama = olumlu). */
function literalOf(c: Token[]): { atom: string; negated: boolean } | null {
  let i = 0;
  let neg = false;
  while (i < c.length && c[i].type === "word" && c[i].value === "__not__") {
    neg = !neg;
    i += 1;
  }
  if (c.length - i !== 1 || c[i].type !== "word") return null;
  return { atom: c[i].value, negated: neg };
}

type Bound = { lo: number; loStrict: boolean; hi: number; hiStrict: boolean };

function segmentTokens(ast: AstNode): Token[][] {
  // AST yapraklarından belirteç akışını bölüm bazında geri kurar.
  const segs: Token[][] = [];
  for (const seg of ast.children) {
    const flat: Token[] = [];
    const walk = (n: AstNode) => {
      if (n.type === "block") {
        flat.push({ type: "open", value: "(", at: 0 });
        n.children.forEach(walk);
        flat.push({ type: "close", value: ")", at: 0 });
        return;
      }
      if (n.type !== "segment") flat.push({ type: n.type as Token["type"], value: n.label, at: 0 });
      n.children.forEach(walk);
    };
    walk(seg);
    segs.push(flat);
  }
  return segs;
}

/** AST üzerinde kapalı çelişki arar. */
export function findContradiction(text: string): Contradiction | null {
  const { ast } = askAscii(normalizeLogic(text));
  for (const seg of segmentTokens(ast)) {
    // Ayrışma (|) içeren bölümler kapalı çelişki üretmez.
    if (seg.some((t) => t.type === "operator" && t.value === "|")) continue;
    const lits = new Map<string, boolean>();
    const bounds = new Map<string, Bound>();

    for (const c of conjuncts(seg)) {
      const lit = literalOf(c);
      if (lit) {
        const prev = lits.get(lit.atom);
        if (prev !== undefined && prev !== lit.negated)
          return { kind: "propositional", detail: `${lit.atom} ∧ ¬${lit.atom}` };
        lits.set(lit.atom, lit.negated);
        continue;
      }
      if (c.length !== 3 || c[1].type !== "operator") continue;
      const a = atomOf(c[0]);
      const b = atomOf(c[2]);
      const op = c[1].value;
      if (!a || !b) continue;

      const bothConst =
        (a.kind === "number" && b.kind === "number") || (a.kind === "bool" && b.kind === "bool");
      if (bothConst) {
        const x = a.kind === "number" ? Number(a.value) : a.value;
        const y = b.kind === "number" ? Number(b.value) : b.value;
        let ok = true;
        if (op === "=" || op === "==") ok = x === y;
        else if (op === "!=") ok = x !== y;
        else if (typeof x === "number" && typeof y === "number") {
          if (op === "<") ok = x < y;
          else if (op === ">") ok = x > y;
          else if (op === "<=") ok = x <= y;
          else if (op === ">=") ok = x >= y;
        }
        if (!ok) return { kind: "literal", detail: `${a.value} ${op} ${b.value}` };
        continue;
      }

      // Değişken-sabit karşılaştırması → aralık kısıtı
      let v: string | null = null;
      let n = NaN;
      let o = op;
      if (a.kind === "var" && b.kind === "number") {
        v = a.value;
        n = Number(b.value);
      } else if (a.kind === "number" && b.kind === "var") {
        v = b.value;
        n = Number(a.value);
        o = ({ "<": ">", ">": "<", "<=": ">=", ">=": "<=" } as Record<string, string>)[op] ?? op;
      }
      if (!v || !Number.isFinite(n)) continue;
      const bd = bounds.get(v) ?? { lo: -Infinity, loStrict: false, hi: Infinity, hiStrict: false };
      if (o === ">" || o === ">=") {
        if (n > bd.lo || (n === bd.lo && o === ">")) {
          bd.lo = n;
          bd.loStrict = o === ">";
        }
      } else if (o === "<" || o === "<=") {
        if (n < bd.hi || (n === bd.hi && o === "<")) {
          bd.hi = n;
          bd.hiStrict = o === "<";
        }
      } else if (o === "=" || o === "==") {
        if (n < bd.lo || n > bd.hi) return { kind: "range", detail: `${v} = ${n} aralık dışı` };
        bd.lo = bd.hi = n;
        bd.loStrict = bd.hiStrict = false;
      } else continue;
      bounds.set(v, bd);
      if (bd.lo > bd.hi || (bd.lo === bd.hi && (bd.loStrict || bd.hiStrict)))
        return { kind: "range", detail: `${v} için boş aralık` };
    }
  }
  return null;
}
