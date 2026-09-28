/**
 * UBL-TR 2.1 fatura belgesi üretimi (e-Fatura / e-Arşiv biçimi).
 *
 * Tahsilatı ve yasal vergi beyanını Paddle (Merchant of Record) yapar.
 * Buradaki belge, kullanıcıya kendi muhasebesi için standart biçimde
 * indirilebilir bir kayıt sunar; GİB'e gönderim bu modülün kapsamında
 * değildir. Tutarlar ödeme sağlayıcısının bildirdiği değerlerden okunur,
 * yeniden hesaplanmaz.
 */

export type InvoiceParty = {
  name: string;
  taxId: string;
  country: string;
  city?: string;
  email?: string;
};

export type InvoiceSource = {
  /** Ödeme sağlayıcısının işlem kimliği. */
  transactionId: string;
  /** ISO tarih (işlem oluşma anı). */
  createdAt: string;
  currency: string;
  /** Vergi dahil toplam. */
  total: number;
  /** Tahsil edilen vergi. */
  tax: number;
  buyer: { email: string; name?: string; country?: string; taxId?: string };
  /** Satır açıklaması (plan adı). */
  description: string;
};

export type InvoiceDocument = {
  /** Fatura numarası: TBG + yıl + işlem parmak izi. */
  id: string;
  /** Evrensel Tekil Tanımlama Numarası (UUID biçiminde, deterministik). */
  ettn: string;
  issueDate: string;
  issueTime: string;
  profileId: "EARSIVFATURA";
  typeCode: "SATIS";
  currency: string;
  lineExtensionAmount: number;
  taxAmount: number;
  payableAmount: number;
  taxPercent: number;
  supplier: InvoiceParty;
  customer: InvoiceParty;
  description: string;
};

/** Satıcı (Merchant of Record altında kayıt sahibi). */
export const SUPPLIER: InvoiceParty = {
  name: "Mehmet DİNÇ (Tedbirge® WebOS)",
  taxId: "1111111111",
  country: "Türkiye",
  city: "Sakarya",
  email: "fatura@tedbirge.app",
};

const HEX = "0123456789abcdef";

/** Deterministik 128 bit özet (FNV-1a tabanlı, dört tur). */
function digest128(input: string): string {
  const words: number[] = [];
  for (let round = 0; round < 4; round += 1) {
    let h = 0x811c9dc5 ^ (round * 0x9e3779b9);
    for (let i = 0; i < input.length; i += 1) {
      h ^= input.charCodeAt(i) + round;
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    words.push(h >>> 0);
  }
  return words
    .map((w) => {
      let out = "";
      for (let i = 7; i >= 0; i -= 1) out += HEX[(w >>> (i * 4)) & 0xf];
      return out;
    })
    .join("");
}

/** İşlem kimliğinden deterministik ETTN (UUID v4 biçimi). */
export function ettnFor(transactionId: string): string {
  const h = digest128(`ettn:${transactionId}`);
  const v = `${h.slice(0, 12)}4${h.slice(13, 16)}${h.slice(16)}`;
  const variant = `8${v.slice(17, 20)}`;
  return [v.slice(0, 8), v.slice(8, 12), v.slice(12, 16), variant, v.slice(20, 32)].join("-");
}

/** Fatura numarası: TBG + yıl + 8 haneli deterministik sıra. */
export function invoiceNumberFor(transactionId: string, createdAt: string): string {
  const year = new Date(createdAt).getUTCFullYear();
  const serial = (parseInt(digest128(transactionId).slice(0, 8), 16) % 100_000_000)
    .toString()
    .padStart(8, "0");
  return `TBG${year}${serial}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** İşlem kaydını UBL-TR alanlarına dönüştürür. */
export function buildInvoiceDocument(src: InvoiceSource): InvoiceDocument {
  const total = round2(Number(src.total) || 0);
  const tax = round2(Number(src.tax) || 0);
  const net = round2(total - tax);
  const when = new Date(src.createdAt);
  const iso = Number.isNaN(when.getTime()) ? new Date(0) : when;
  return {
    id: invoiceNumberFor(src.transactionId, src.createdAt),
    ettn: ettnFor(src.transactionId),
    issueDate: iso.toISOString().slice(0, 10),
    issueTime: iso.toISOString().slice(11, 19),
    profileId: "EARSIVFATURA",
    typeCode: "SATIS",
    currency: (src.currency || "EUR").toUpperCase(),
    lineExtensionAmount: net,
    taxAmount: tax,
    payableAmount: total,
    taxPercent: net > 0 ? Math.round((tax / net) * 10000) / 100 : 0,
    supplier: SUPPLIER,
    customer: {
      name: src.buyer.name?.trim() || src.buyer.email,
      taxId: src.buyer.taxId?.trim() || "11111111111",
      country: src.buyer.country?.trim() || "Türkiye",
      email: src.buyer.email,
    },
    description: src.description,
  };
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function party(tag: string, p: InvoiceParty): string {
  return `  <cac:${tag}>
    <cac:Party>
      <cbc:WebsiteURI>https://tedbirge.app</cbc:WebsiteURI>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${esc(p.taxId)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${esc(p.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:CityName>${esc(p.city ?? "")}</cbc:CityName>
        <cac:Country>
          <cbc:Name>${esc(p.country)}</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:Contact>
        <cbc:ElectronicMail>${esc(p.email ?? "")}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:${tag}>`;
}

/** UBL-TR 2.1 uyumlu fatura XML'i üretir. */
export function buildUblTrXml(doc: InvoiceDocument): string {
  const cur = esc(doc.currency);
  const amount = (n: number) => `currencyID="${cur}">${n.toFixed(2)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${doc.profileId}</cbc:ProfileID>
  <cbc:ID>${esc(doc.id)}</cbc:ID>
  <cbc:UUID>${esc(doc.ettn)}</cbc:UUID>
  <cbc:IssueDate>${doc.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${doc.issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${doc.typeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>1</cbc:LineCountNumeric>
${party("AccountingSupplierParty", doc.supplier)}
${party("AccountingCustomerParty", doc.customer)}
  <cac:TaxTotal>
    <cbc:TaxAmount ${amount(doc.taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount ${amount(doc.lineExtensionAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount ${amount(doc.taxAmount)}</cbc:TaxAmount>
      <cbc:Percent>${doc.taxPercent.toFixed(2)}</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:Name>KDV</cbc:Name>
          <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount ${amount(doc.lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount ${amount(doc.lineExtensionAmount)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount ${amount(doc.payableAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount ${amount(doc.payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount ${amount(doc.lineExtensionAmount)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${esc(doc.description)}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount ${amount(doc.lineExtensionAmount)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
</Invoice>
`;
}

/** Yazdırılabilir e-Arşiv özeti (HTML). Ham ödeme verisi taşımaz. */
export function buildArchiveHtml(doc: InvoiceDocument): string {
  const row = (k: string, v: string) =>
    `<tr><th style="text-align:left;padding:6px 12px 6px 0">${esc(k)}</th><td style="padding:6px 0">${esc(v)}</td></tr>`;
  const money = (n: number) => `${n.toFixed(2)} ${doc.currency}`;
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${esc(doc.id)}</title></head>
<body style="font:14px system-ui;margin:32px;color:#111">
<h1 style="font-size:18px">e-Arşiv Fatura Özeti</h1>
<table>
${row("Fatura no", doc.id)}
${row("ETTN", doc.ettn)}
${row("Tarih", `${doc.issueDate} ${doc.issueTime}`)}
${row("Satıcı", doc.supplier.name)}
${row("Alıcı", doc.customer.name)}
${row("Hizmet", doc.description)}
${row("Matrah", money(doc.lineExtensionAmount))}
${row("KDV", `${money(doc.taxAmount)} (%${doc.taxPercent.toFixed(2)})`)}
${row("Ödenecek", money(doc.payableAmount))}
</table>
<p style="margin-top:24px;font-size:12px;color:#555">
Tahsilat ve yasal vergi beyanı Paddle (Merchant of Record) tarafından yapılır.
Bu belge müşteri muhasebe kaydı için UBL-TR 2.1 alanlarıyla üretilmiştir.
</p>
</body></html>
`;
}
