/**
 * Hesap tablosu formül motoru — belirteçleyici + özyinelemeli iniş ayrıştırıcı.
 * `eval`/`Function` kullanılmaz. Hata kodları: #CYCLE, #DIV/0, #REF, #NAME, #HATA.
 */

export type Cells = Record<string, string>;
type Val = number | string | boolean | Val[];

class FormulaError extends Error {}

export function colName(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}
export function colIndex(name: string): number {
  return name.toUpperCase().split("").reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1;
}
export function parseRef(ref: string): { c: number; r: number } | null {
  const m = /^\$?([A-Z]+)\$?(\d+)$/i.exec(ref);
  return m ? { c: colIndex(m[1]!), r: Number(m[2]) } : null;
}

type Tok = { t: "num" | "str" | "ref" | "range" | "id" | "op" | "(" | ")" | ","; v: string };

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    const rest = s.slice(i);
    let m: RegExpExecArray | null;
    if ((m = /^\d+(\.\d+)?/.exec(rest))) out.push({ t: "num", v: m[0] });
    else if ((m = /^"([^"]*)"/.exec(rest))) out.push({ t: "str", v: m[1]! });
    else if ((m = /^\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+/i.exec(rest))) out.push({ t: "range", v: m[0].toUpperCase() });
    else if ((m = /^\$?[A-Z]+\$?\d+(?![A-Z(])/i.exec(rest))) out.push({ t: "ref", v: m[0].toUpperCase() });
    else if ((m = /^[A-Z_][A-Z0-9_]*/i.exec(rest))) out.push({ t: "id", v: m[0].toUpperCase() });
    else if ((m = /^(<=|>=|<>|[-+*/^&=<>])/.exec(rest))) out.push({ t: "op", v: m[0] });
    else if (ch === "(" || ch === ")" || ch === ",") out.push({ t: ch, v: ch });
    else if (ch === ";") out.push({ t: ",", v: "," });
    else throw new FormulaError("#HATA");
    i += m ? m[0].length : 1;
  }
  return out;
}

const num = (v: Val): number => {
  if (Array.isArray(v)) return num(v[0] ?? 0);
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === "") return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new FormulaError("#HATA");
  return n;
};
const flat = (vs: Val[]): Val[] => vs.flatMap((v) => (Array.isArray(v) ? flat(v) : [v]));
const nums = (vs: Val[]) => flat(vs).filter((v) => v !== "" && !Number.isNaN(Number(v)) && typeof v !== "boolean").map(Number);

const FUNCS: Record<string, (a: Val[]) => Val> = {
  SUM: (a) => nums(a).reduce((x, y) => x + y, 0),
  AVERAGE: (a) => { const n = nums(a); if (!n.length) throw new FormulaError("#DIV/0"); return n.reduce((x, y) => x + y, 0) / n.length; },
  MIN: (a) => { const n = nums(a); return n.length ? Math.min(...n) : 0; },
  MAX: (a) => { const n = nums(a); return n.length ? Math.max(...n) : 0; },
  COUNT: (a) => nums(a).length,
  COUNTA: (a) => flat(a).filter((v) => v !== "").length,
  IF: (a) => (num(a[0] ?? 0) !== 0 ? (a[1] ?? true) : (a[2] ?? false)),
  ROUND: (a) => { const d = 10 ** num(a[1] ?? 0); return Math.round(num(a[0] ?? 0) * d) / d; },
  ABS: (a) => Math.abs(num(a[0] ?? 0)),
  AND: (a) => flat(a).every((v) => num(v) !== 0),
  OR: (a) => flat(a).some((v) => num(v) !== 0),
  NOT: (a) => num(a[0] ?? 0) === 0,
};
FUNCS.AVG = FUNCS.AVERAGE!;

export function evaluate(raw: string, cells: Cells, stack: Set<string> = new Set()): string {
  if (!raw.startsWith("=")) return raw;
  try {
    const v = compute(raw.slice(1), cells, stack);
    const s = (Array.isArray(v) ? (flat(v)[0] ?? "") : v) as string | number | boolean;
    if (typeof s === "boolean") return s ? "TRUE" : "FALSE";
    if (typeof s === "number") {
      if (!Number.isFinite(s)) return "#DIV/0";
      return String(Math.round(s * 1e10) / 1e10);
    }
    return s;
  } catch (e) {
    return e instanceof FormulaError ? e.message : "#HATA";
  }
}

function compute(src: string, cells: Cells, stack: Set<string>): Val {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const eat = (t?: string) => {
    const k = toks[p++];
    if (!k || (t && k.t !== t && k.v !== t)) throw new FormulaError("#HATA");
    return k;
  };

  const cell = (ref: string): Val => {
    const key = ref.replace(/\$/g, "");
    if (!parseRef(key)) throw new FormulaError("#REF");
    if (stack.has(key)) throw new FormulaError("#CYCLE");
    const rawv = cells[key] ?? "";
    if (!rawv.startsWith("=")) return rawv;
    const next = new Set(stack).add(key);
    const r = evaluate(rawv, cells, next);
    if (r.startsWith("#")) throw new FormulaError(r);
    return r;
  };
  const range = (r: string): Val[] => {
    const [a, b] = r.split(":").map((x) => parseRef(x.replace(/\$/g, "")));
    if (!a || !b) throw new FormulaError("#REF");
    const out: Val[] = [];
    for (let row = Math.min(a.r, b.r); row <= Math.max(a.r, b.r); row++)
      for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) out.push(cell(`${colName(c)}${row}`));
    return out;
  };

  const primary = (): Val => {
    const k = eat();
    if (k.t === "num") return Number(k.v);
    if (k.t === "str") return k.v;
    if (k.t === "ref") return cell(k.v);
    if (k.t === "range") return range(k.v);
    if (k.t === "op" && k.v === "-") return -num(power());
    if (k.t === "op" && k.v === "+") return num(power());
    if (k.t === "(") { const v = comparison(); eat(")"); return v; }
    if (k.t === "id") {
      if (k.v === "TRUE") return true;
      if (k.v === "FALSE") return false;
      const fn = FUNCS[k.v];
      if (!fn) throw new FormulaError("#NAME");
      eat("(");
      const args: Val[] = [];
      if (peek()?.t !== ")") {
        args.push(comparison());
        while (peek()?.t === ",") { eat(","); args.push(comparison()); }
      }
      eat(")");
      return fn(args);
    }
    throw new FormulaError("#HATA");
  };
  const power = (): Val => {
    let l = primary();
    while (peek()?.v === "^") { eat(); l = num(l) ** num(primary()); }
    return l;
  };
  const term = (): Val => {
    let l = power();
    while (peek()?.v === "*" || peek()?.v === "/") {
      const op = eat().v;
      const r = num(power());
      if (op === "/" && r === 0) throw new FormulaError("#DIV/0");
      l = op === "*" ? num(l) * r : num(l) / r;
    }
    return l;
  };
  const additive = (): Val => {
    let l = term();
    while (peek()?.v === "+" || peek()?.v === "-" || peek()?.v === "&") {
      const op = eat().v;
      const r = term();
      l = op === "&" ? `${Array.isArray(l) ? l[0] : l}${Array.isArray(r) ? r[0] : r}` : op === "+" ? num(l) + num(r) : num(l) - num(r);
    }
    return l;
  };
  const comparison = (): Val => {
    const l = additive();
    const op = peek();
    if (op?.t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(op.v)) {
      eat();
      const r = additive();
      const bothNum = !Number.isNaN(Number(l)) && !Number.isNaN(Number(r));
      const a = bothNum ? num(l) : String(l);
      const b = bothNum ? num(r) : String(r);
      switch (op.v) {
        case "=": return a === b;
        case "<>": return a !== b;
        case "<": return a < b;
        case ">": return a > b;
        case "<=": return a <= b;
        default: return a >= b;
      }
    }
    return l;
  };

  const v = comparison();
  if (p < toks.length) throw new FormulaError("#HATA");
  return v;
}

/** Göreli referansları (dc, dr) kadar kaydırır; `$` ile sabitlenenler korunur. */
export function shiftFormula(raw: string, dc: number, dr: number): string {
  if (!raw.startsWith("=")) {
    const n = Number(raw);
    return raw !== "" && Number.isFinite(n) ? raw : raw;
  }
  return raw.replace(/(\$?)([A-Z]+)(\$?)(\d+)(?![A-Z(])/g, (m, dcol: string, col: string, drow: string, row: string) => {
    const c = dcol ? colIndex(col) : colIndex(col) + dc;
    const r = drow ? Number(row) : Number(row) + dr;
    if (c < 0 || r < 1) return "#REF";
    return `${dcol}${colName(c)}${drow}${r}`;
  });
}

/**
 * Doldurma: kaynak değerleri hedef boyunca uzatır. İki+ sayısal kaynakta
 * aritmetik seri sürdürülür; formüller göreli kaydırılır.
 */
export function fillSeries(source: string[], length: number, axis: "down" | "right"): string[] {
  const out: string[] = [];
  const numeric = source.length >= 2 && source.every((s) => s !== "" && Number.isFinite(Number(s)));
  const step = numeric ? Number(source[source.length - 1]) - Number(source[source.length - 2]) : 0;
  for (let i = 0; i < length; i++) {
    if (numeric) {
      out.push(String(Number(source[source.length - 1]) + step * (i + 1)));
      continue;
    }
    const src = source[i % source.length] ?? "";
    const offset = Math.floor(i / source.length) * source.length + source.length;
    out.push(axis === "down" ? shiftFormula(src, 0, offset) : shiftFormula(src, offset, 0));
  }
  return out;
}
