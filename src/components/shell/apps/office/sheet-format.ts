/** Hücre biçimleri: Genel / Sayı / Para / Yüzde ve hizalama. */

export type NumFormat = "general" | "number" | "try" | "usd" | "eur" | "percent";
export type Align = "left" | "center" | "right";
export type CellFormat = { num?: NumFormat; align?: Align };

const CURRENCY: Record<string, string> = { try: "TRY", usd: "USD", eur: "EUR" };

export function formatValue(value: string, fmt?: CellFormat): string {
  const num = fmt?.num ?? "general";
  if (num === "general" || value.trim() === "") return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  if (num === "number")
    return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  if (num === "percent")
    return new Intl.NumberFormat("tr-TR", { style: "percent", maximumFractionDigits: 2 }).format(n);
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: CURRENCY[num]! }).format(n);
}

/** Hizalama belirtilmemişse sayılar sağa, metin sola yaslanır. */
export function alignOf(value: string, fmt?: CellFormat): Align {
  if (fmt?.align) return fmt.align;
  return value.trim() !== "" && Number.isFinite(Number(value)) ? "right" : "left";
}
