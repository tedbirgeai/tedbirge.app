/** Belgede bul/değiştir: metin düğümleri üzerinde çalışır, HTML yapısını korur. */

export function findIndices(text: string, query: string, caseSensitive = false): number[] {
  if (!query) return [];
  const hay = caseSensitive ? text : text.toLocaleLowerCase("tr-TR");
  const needle = caseSensitive ? query : query.toLocaleLowerCase("tr-TR");
  const out: number[] = [];
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    i = hay.indexOf(needle, i + needle.length);
  }
  return out;
}

export function replaceInText(text: string, query: string, repl: string, caseSensitive = false): string {
  const idx = findIndices(text, query, caseSensitive);
  if (!idx.length) return text;
  let out = "";
  let last = 0;
  for (const i of idx) {
    out += text.slice(last, i) + repl;
    last = i + query.length;
  }
  return out + text.slice(last);
}

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

export type Match = { node: Text; start: number; end: number };

export function findInDom(root: Node, query: string, caseSensitive = false): Match[] {
  const out: Match[] = [];
  for (const node of textNodes(root))
    for (const i of findIndices(node.data, query, caseSensitive))
      out.push({ node, start: i, end: i + query.length });
  return out;
}

export function selectMatch(m: Match) {
  const range = document.createRange();
  range.setStart(m.node, m.start);
  range.setEnd(m.node, m.end);
  const sel = document.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
  m.node.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" });
}

export function replaceMatch(m: Match, repl: string) {
  m.node.data = m.node.data.slice(0, m.start) + repl + m.node.data.slice(m.end);
}

export function replaceAllInDom(root: Node, query: string, repl: string, caseSensitive = false): number {
  let n = 0;
  for (const node of textNodes(root)) {
    const c = findIndices(node.data, query, caseSensitive).length;
    if (c) {
      node.data = replaceInText(node.data, query, repl, caseSensitive);
      n += c;
    }
  }
  return n;
}
