/**
 * Vergi ÖN İZLEME yardımcısı.
 * Tahsil edilen vergiyi Paddle (Merchant of Record) hesaplar ve faturalar;
 * buradaki oranlar yalnız fiyat kartında tahmini gösterim içindir ve yasal
 * belge üretmez. UBL-TR e-Fatura/e-Arşiv üretimi bu modülün kapsamında değildir.
 */

/** Standart KDV/VAT oranları (bilgi amaçlı; son doğrulama: Paddle checkout). */
export const STANDARD_VAT: Record<string, number> = {
  TR: 0.2,
  DE: 0.19,
  FR: 0.2,
  NL: 0.21,
  IT: 0.22,
  ES: 0.21,
  GB: 0.2,
  US: 0,
};

export type TaxPreview = { net: number; tax: number; gross: number; rate: number; estimated: true };

/** B2B ve geçerli vergi numarası varsa AB içi ters ibraz: vergi 0 gösterilir. */
export function previewTax(net: number, country: string, opts?: { b2bReverseCharge?: boolean }): TaxPreview {
  const rate = opts?.b2bReverseCharge ? 0 : (STANDARD_VAT[country.toUpperCase()] ?? 0);
  const tax = Math.round(net * rate * 100) / 100;
  return { net, tax, gross: Math.round((net + tax) * 100) / 100, rate, estimated: true };
}
