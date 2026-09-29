/** Axiom Bot yardımcıları: iddia algılama ve karar etiketleri. */

/** Karşılaştırma/eşitlik içeren kısa ifadeler AXIOM'a gönderilir. */
export function looksLikeClaim(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 400) return false;
  return /[^=!<>]=[^=]|<=|>=|[<>≤≥≠]/.test(t) && /\d|[a-z]/i.test(t);
}

export function verdictLabel(verdict: string): string {
  const v = verdict.toUpperCase();
  if (v.includes("REFUT") || v.includes("409")) return "çelişki bulundu";
  if (v.includes("UNDECID") || v.includes("422")) return "karar verilemedi";
  if (v.includes("PROV") || v.includes("VERIF") || v.includes("200")) return "doğrulandı";
  return verdict;
}
