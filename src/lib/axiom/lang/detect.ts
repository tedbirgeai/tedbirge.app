/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * ÇOKLU İNSAN / KOD DİLİ TANIMA
 * ------------------------------------------------------------------
 * Girdinin hangi dilde olduğu yazı sistemi (script) ve sözdizimi imzaları
 * ile puanlanır. Harici model ya da sözlük indirmesi yoktur: tümü yerel,
 * deterministik ve saf fonksiyondur. Kararsız kaldığında "bilinmiyor"
 * döner — asla uydurma bir dil iddia edilmez.
 */

export type LangKind = "human" | "code" | "unknown";

export type LangGuess = {
  kind: LangKind;
  /** Kısa kimlik: "tr", "en", "rust"… */
  id: string;
  label: string;
  /** 0–1 arası güven. */
  confidence: number;
  /** Baskın yazı sistemi. */
  script: string;
  /** Kararı açıklayan kısa gerekçe. */
  reason: string;
};

type CodeRule = { id: string; label: string; patterns: RegExp[]; weight?: number };

/** Programlama ve donanım dilleri için sözdizimi imzaları. */
const CODE_RULES: CodeRule[] = [
  {
    id: "rust",
    label: "Rust",
    patterns: [/\bfn\s+\w+\s*\(/, /\blet\s+mut\b/, /->\s*\w+\s*\{/, /\bimpl\b/, /::</],
  },
  {
    id: "c",
    label: "C / C++",
    patterns: [/#include\s*[<"]/, /\bint\s+main\s*\(/, /\bprintf\s*\(/, /\bstd::/, /\bmalloc\s*\(/],
  },
  {
    id: "ada",
    label: "Ada",
    patterns: [/\bprocedure\b.*\bis\b/i, /\bbegin\b[\s\S]*\bend\b/i, /\bwith\s+Ada\./i, /:=/],
  },
  {
    id: "java",
    label: "Java / Kotlin",
    patterns: [
      /\bpublic\s+(static\s+)?(class|void)\b/,
      /\bSystem\.out\.println\b/,
      /\bfun\s+\w+\s*\(/,
      /\bimport\s+java\./,
    ],
  },
  {
    id: "cobol",
    label: "COBOL",
    patterns: [
      /\bIDENTIFICATION\s+DIVISION\b/i,
      /\bPROCEDURE\s+DIVISION\b/i,
      /\bPERFORM\b/i,
      /\bDISPLAY\b.*\./i,
    ],
  },
  {
    id: "fortran",
    label: "Fortran",
    patterns: [
      /\bPROGRAM\s+\w+/i,
      /\bIMPLICIT\s+NONE\b/i,
      /\bEND\s+(PROGRAM|SUBROUTINE)\b/i,
      /\bDO\s+\d+\s+\w+\s*=/i,
    ],
  },
  {
    id: "solidity",
    label: "Solidity",
    patterns: [
      /\bpragma\s+solidity\b/,
      /\bcontract\s+\w+/,
      /\bmsg\.sender\b/,
      /\bfunction\s+\w+\s*\([^)]*\)\s*(public|external|internal)/,
    ],
  },
  {
    id: "hdl",
    label: "VHDL / Verilog",
    patterns: [
      /\bentity\s+\w+\s+is\b/i,
      /\barchitecture\s+\w+\s+of\b/i,
      /\balways\s*@\s*\(/,
      /\bmodule\s+\w+\s*\(/,
      /<=\s*\w+\s*;/,
    ],
  },
  {
    id: "python",
    label: "Python",
    patterns: [/\bdef\s+\w+\s*\(.*\)\s*:/, /\bimport\s+\w+/, /\bself\./, /\belif\b/],
  },
  {
    id: "sql",
    label: "SQL",
    patterns: [/\bSELECT\b[\s\S]*\bFROM\b/i, /\bINSERT\s+INTO\b/i, /\bCREATE\s+TABLE\b/i],
  },
  {
    id: "ts",
    label: "TypeScript / JavaScript",
    patterns: [
      /\b(const|let)\s+\w+\s*[:=]/,
      /\bfunction\s+\w+\s*\(/,
      /=>\s*\{/,
      /\binterface\s+\w+\s*\{/,
    ],
  },
];

/** Yazı sistemi aralıkları (baskın script tespiti). */
const SCRIPTS: Array<{ name: string; re: RegExp }> = [
  { name: "Latin", re: /[A-Za-zÇĞİÖŞÜçğıöşü]/ },
  { name: "Kiril", re: /[\u0400-\u04ff]/ },
  { name: "Yunan", re: /[\u0370-\u03ff]/ },
  { name: "Arap", re: /[\u0600-\u06ff]/ },
  { name: "İbrani", re: /[\u0590-\u05ff]/ },
  { name: "Devanagari", re: /[\u0900-\u097f]/ },
  { name: "Han", re: /[\u4e00-\u9fff]/ },
  { name: "Kana", re: /[\u3040-\u30ff]/ },
  { name: "Hangul", re: /[\uac00-\ud7af]/ },
];

/** İnsan dilleri: yüksek frekanslı işlev sözcükleri. */
const HUMAN_RULES: Array<{ id: string; label: string; script: string; words: string[] }> = [
  {
    id: "tr",
    label: "Türkçe",
    script: "Latin",
    words: ["bir", "ve", "için", "ile", "olan", "değil", "sistem", "enerji", "kanun", "olarak"],
  },
  {
    id: "en",
    label: "İngilizce",
    script: "Latin",
    words: ["the", "and", "is", "of", "for", "with", "energy", "system", "not", "that"],
  },
  {
    id: "de",
    label: "Almanca",
    script: "Latin",
    words: ["der", "die", "das", "und", "nicht", "mit", "ist", "energie", "wird"],
  },
  {
    id: "fr",
    label: "Fransızca",
    script: "Latin",
    words: ["le", "la", "les", "des", "est", "pour", "avec", "énergie", "pas"],
  },
  {
    id: "es",
    label: "İspanyolca",
    script: "Latin",
    words: ["el", "la", "los", "una", "que", "para", "con", "energía", "no"],
  },
  { id: "ru", label: "Rusça", script: "Kiril", words: ["и", "не", "для", "это", "энергия"] },
  { id: "el", label: "Yunanca", script: "Yunan", words: ["και", "το", "της", "ενέργεια"] },
  { id: "ar", label: "Arapça", script: "Arap", words: ["في", "من", "على", "الطاقة"] },
  { id: "zh", label: "Çince", script: "Han", words: ["的", "是", "能量", "系统"] },
  { id: "ja", label: "Japonca", script: "Kana", words: ["です", "する", "エネルギー", "の"] },
  { id: "ko", label: "Korece", script: "Hangul", words: ["입니다", "에너지", "그리고"] },
];

/**
 * SMT-LIB 2 imzası: bu girdi dil tanımaya değil doğrudan doğrulayıcıya gider.
 */
const SMT_PATTERNS: RegExp[] = [
  /\(\s*declare-(const|fun|sort|datatypes)\b/i,
  /\(\s*assert\b/i,
  /\(\s*check-sat\b/i,
  /\(\s*set-logic\b/i,
  /\(\s*define-fun\b/i,
  /\(\s*get-model\b/i,
];

/** Girdi SMT-LIB 2 programı mı? */
export function isSmtLib(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("(") && !/\(\s*(set-logic|declare-|assert|check-sat)/i.test(trimmed))
    return false;
  const hits = SMT_PATTERNS.reduce((n, re) => (re.test(trimmed) ? n + 1 : n), 0);
  return hits >= 2 || /\(\s*check-sat\b/i.test(trimmed);
}

/** Baskın yazı sistemini döner. */
export function dominantScript(text: string): string {
  let best = "Bilinmiyor";
  let bestCount = 0;
  for (const s of SCRIPTS) {
    let count = 0;
    for (const ch of text) if (s.re.test(ch)) count += 1;
    if (count > bestCount) {
      bestCount = count;
      best = s.name;
    }
  }
  return bestCount > 0 ? best : "Bilinmiyor";
}

function codeScore(text: string): { rule: CodeRule; hits: number } | null {
  let best: { rule: CodeRule; hits: number } | null = null;
  for (const rule of CODE_RULES) {
    const hits = rule.patterns.reduce((n, re) => (re.test(text) ? n + 1 : n), 0);
    if (hits > 0 && (!best || hits > best.hits)) best = { rule, hits };
  }
  return best;
}

function humanScore(text: string, script: string) {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const set = new Set(words);
  let best: { id: string; label: string; hits: number } | null = null;
  for (const rule of HUMAN_RULES) {
    if (rule.script !== script && script !== "Bilinmiyor") continue;
    let hits = 0;
    for (const w of rule.words) {
      if (set.has(w)) hits += 1;
      else if (rule.script !== "Latin" && text.includes(w)) hits += 1;
    }
    if (hits > 0 && (!best || hits > best.hits)) best = { id: rule.id, label: rule.label, hits };
  }
  return { best, wordCount: words.length };
}

/**
 * Girdinin dilini tahmin eder. Kod imzaları insan dili sözcüklerinden
 * önce gelir: kod bloğu içindeki İngilizce anahtar sözcükler girdiyi
 * "İngilizce metin" saymamalıdır.
 */
export function detectLanguage(text: string): LangGuess {
  const trimmed = text.trim();
  const script = dominantScript(trimmed);
  if (!trimmed) {
    return {
      kind: "unknown",
      id: "none",
      label: "Girdi yok",
      confidence: 0,
      script,
      reason: "Girdi boş.",
    };
  }

  // SMT-LIB her şeyden önce gelir: NLP/dil kurallarına düşmez.
  if (isSmtLib(trimmed)) {
    return {
      kind: "code",
      id: "smt",
      label: "SMT-LIB 2",
      confidence: 1,
      script,
      reason: "SMT-LIB imzası doğrudan doğrulayıcıya yönlendirildi (check-sat).",
    };
  }

  const code = codeScore(trimmed);
  const symbolRatio =
    (trimmed.match(/[{};()<>[\]=+*/#$&|]/g)?.length ?? 0) / Math.max(1, trimmed.length);

  if (code && (code.hits >= 2 || (code.hits === 1 && symbolRatio > 0.04))) {
    return {
      kind: "code",
      id: code.rule.id,
      label: code.rule.label,
      confidence: Math.min(0.97, 0.55 + code.hits * 0.14),
      script,
      reason: `${code.hits} sözdizimi imzası eşleşti (simge yoğunluğu %${Math.round(
        symbolRatio * 100,
      )}).`,
    };
  }

  const { best, wordCount } = humanScore(trimmed, script);
  if (best) {
    const density = best.hits / Math.max(3, Math.min(wordCount, 40));
    return {
      kind: "human",
      id: best.id,
      label: best.label,
      confidence: Math.min(0.96, 0.45 + density * 2 + best.hits * 0.05),
      script,
      reason: `${best.hits} işlev sözcüğü eşleşti (${script} yazı sistemi).`,
    };
  }

  if (code) {
    return {
      kind: "code",
      id: code.rule.id,
      label: code.rule.label,
      confidence: 0.4,
      script,
      reason: "Tek sözdizimi imzası eşleşti; güven düşük.",
    };
  }

  return {
    kind: "unknown",
    id: "unknown",
    label: "Bilinmiyor",
    confidence: 0,
    script,
    reason: "Ne dil sözcükleri ne de sözdizimi imzası eşleşti.",
  };
}
