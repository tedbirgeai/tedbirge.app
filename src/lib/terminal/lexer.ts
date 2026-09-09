/**
 * TERMİNAL SÖZDİZİMİ AYRIŞTIRICI
 * ------------------------------------------------------------------
 * Kabuk girdisini belirteçlere böler. Tırnak içindeki boşluklar tek
 * parametre sayılır; boru hattı (|) ve yönlendirme (>, >>) operatörleri
 * ayrı belirteç olarak çıkar. Hiçbir işlem ağa çıkmaz.
 */

export type Redirect = { mode: ">" | ">>"; target: string };

export type Stage = { argv: string[] };

export type Pipeline = {
  stages: Stage[];
  redirect: Redirect | null;
};

/** Tırnak duyarlı belirteçleme; operatörler kendi belirteçleridir. */
export function lex(input: string): string[] {
  const out: string[] = [];
  let buf = "";
  let quote: '"' | "'" | null = null;
  let quoted = false;

  const flush = () => {
    if (buf.length || quoted) out.push(buf);
    buf = "";
    quoted = false;
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] as string;
    if (quote) {
      if (ch === quote) {
        quote = null;
        quoted = true;
      } else {
        buf += ch;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "\\" && i + 1 < input.length) {
      buf += input[i + 1];
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (ch === "|") {
      flush();
      out.push("|");
      continue;
    }
    if (ch === ">") {
      flush();
      if (input[i + 1] === ">") {
        out.push(">>");
        i += 1;
      } else {
        out.push(">");
      }
      continue;
    }
    buf += ch;
  }
  flush();
  return out;
}

/** Belirteçleri boru hattı + yönlendirme yapısına dönüştürür. */
export function parse(input: string): Pipeline {
  const tokens = lex(input);
  const stages: Stage[] = [];
  let argv: string[] = [];
  let redirect: Redirect | null = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i] as string;
    if (t === "|") {
      if (argv.length) stages.push({ argv });
      argv = [];
      continue;
    }
    if (t === ">" || t === ">>") {
      const target = tokens[i + 1];
      if (!target || target === "|" || target === ">" || target === ">>") {
        throw new Error("Yönlendirme hedefi eksik.");
      }
      redirect = { mode: t, target };
      i += 1;
      continue;
    }
    argv.push(t);
  }
  if (argv.length) stages.push({ argv });
  return { stages, redirect };
}

/** Bayrakları (-l, -a, -rf) ve düz argümanları ayırır. */
export function splitFlags(argv: string[]): { args: string[]; flags: Set<string> } {
  const args: string[] = [];
  const flags = new Set<string>();
  for (const a of argv) {
    if (a.length > 1 && a.startsWith("-") && !/^-\d/.test(a)) {
      if (a.startsWith("--")) flags.add(a.slice(2));
      else for (const c of a.slice(1)) flags.add(c);
    } else {
      args.push(a);
    }
  }
  return { args, flags };
}
