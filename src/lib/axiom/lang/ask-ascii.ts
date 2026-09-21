/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * ASK ASCII/1.0 AYRIŞTIRICI
 * ------------------------------------------------------------------
 * Bayt dizisi → belirteç (token) → ağaç (AST). Faz 1'deki bayt özeti
 * (digest.ts) değişmez; bu katman onun üstüne yapı kurar. Ayrıştırma
 * dilden bağımsızdır: yorumlar, dizgiler, sayılar, işleçler ve parantez
 * blokları evrensel kurallarla ayrılır.
 */

export type TokenType =
  | "word"
  | "number"
  | "string"
  | "comment"
  | "operator"
  | "punct"
  | "open"
  | "close";

export type Token = { type: TokenType; value: string; at: number };

export type AstNode = {
  type: string;
  label: string;
  children: AstNode[];
};

const OPEN = "([{";
const CLOSE = ")]}";
const OPERATORS = [
  "<=",
  ">=",
  "==",
  "!=",
  "=>",
  "->",
  "::",
  ":=",
  "+",
  "-",
  "*",
  "/",
  "=",
  "<",
  ">",
  "^",
  "%",
  "&",
  "|",
];

function isWordChar(ch: string): boolean {
  return /[\p{L}\p{N}_$]/u.test(ch);
}

/** Girdiyi belirteçlere ayırır (yorum ve dizgiler korunur). */
export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    // Satır yorumları: //, #, --, ! (Fortran) ve blok yorumu /* */
    const two = text.slice(i, i + 2);
    if (two === "//" || two === "--" || ch === "#") {
      const end = text.indexOf("\n", i);
      const stop = end === -1 ? text.length : end;
      out.push({ type: "comment", value: text.slice(i, stop), at: i });
      i = stop;
      continue;
    }
    if (two === "/*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      out.push({ type: "comment", value: text.slice(i, stop), at: i });
      i = stop;
      continue;
    }

    // Dizgiler: ' " `
    if (ch === '"' || ch === "'" || ch === "`") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) {
        if (text[j] === "\\") j += 1;
        j += 1;
      }
      out.push({ type: "string", value: text.slice(i, Math.min(j + 1, text.length)), at: i });
      i = j + 1;
      continue;
    }

    // Sayılar (ondalık ve onaltılık)
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < text.length && /[0-9a-fA-FxX._]/.test(text[j])) j += 1;
      out.push({ type: "number", value: text.slice(i, j), at: i });
      i = j;
      continue;
    }

    if (OPEN.includes(ch)) {
      out.push({ type: "open", value: ch, at: i });
      i += 1;
      continue;
    }
    if (CLOSE.includes(ch)) {
      out.push({ type: "close", value: ch, at: i });
      i += 1;
      continue;
    }

    if (isWordChar(ch)) {
      let j = i;
      while (j < text.length && isWordChar(text[j])) j += 1;
      out.push({ type: "word", value: text.slice(i, j), at: i });
      i = j;
      continue;
    }

    const op = OPERATORS.find((o) => text.startsWith(o, i));
    if (op) {
      out.push({ type: "operator", value: op, at: i });
      i += op.length;
      continue;
    }

    out.push({ type: "punct", value: ch, at: i });
    i += 1;
  }
  return out;
}

/**
 * Belirteçleri ağaca çevirir. Parantez blokları iç içe düğüm olur;
 * cümle/deyim sınırları `.`, `;`, `?`, `!` ile ayrılır.
 */
export function parse(tokens: Token[]): AstNode {
  const root: AstNode = { type: "root", label: "KÖK", children: [] };
  let current: AstNode = { type: "segment", label: "Bölüm 1", children: [] };
  const stack: AstNode[] = [];
  let segment = 1;

  const push = (node: AstNode) => {
    (stack.length ? stack[stack.length - 1] : current).children.push(node);
  };

  const closeSegment = () => {
    if (current.children.length) {
      root.children.push(current);
      segment += 1;
    }
    current = { type: "segment", label: `Bölüm ${segment}`, children: [] };
    stack.length = 0;
  };

  for (const t of tokens) {
    if (t.type === "open") {
      const block: AstNode = { type: "block", label: `Blok ${t.value}`, children: [] };
      push(block);
      stack.push(block);
      continue;
    }
    if (t.type === "close") {
      if (stack.length) stack.pop();
      continue;
    }
    if (t.type === "punct" && ".;?!".includes(t.value)) {
      closeSegment();
      continue;
    }
    push({ type: t.type, label: t.value, children: [] });
  }
  closeSegment();
  if (!root.children.length) root.children.push({ type: "segment", label: "Boş", children: [] });
  return root;
}

/** Ağaçtaki düğüm sayısı ve en büyük derinlik. */
export function astMetrics(node: AstNode): { nodes: number; depth: number } {
  let nodes = 1;
  let depth = 1;
  for (const child of node.children) {
    const m = astMetrics(child);
    nodes += m.nodes;
    depth = Math.max(depth, m.depth + 1);
  }
  return { nodes, depth };
}

/** Bayt → belirteç → ağaç zincirini tek adımda çalıştırır. */
export function askAscii(text: string): { tokens: Token[]; ast: AstNode } {
  const tokens = tokenize(text);
  return { tokens, ast: parse(tokens) };
}
