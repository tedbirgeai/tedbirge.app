import { describe, expect, it } from "vitest";

import {
  buildArchiveHtml,
  buildInvoiceDocument,
  buildUblTrXml,
  ettnFor,
  invoiceNumberFor,
  type InvoiceSource,
} from "@/lib/ubl-tr";
import { previewTax } from "@/lib/tax";

const SRC: InvoiceSource = {
  transactionId: "txn_01hxyz",
  createdAt: "2026-03-04T09:15:30.000Z",
  currency: "eur",
  total: 86.4,
  tax: 14.4,
  description: "Tedbirge® WebOS Pro aboneliği",
  buyer: { email: "musteri@example.com" },
};

describe("UBL-TR 2.1 fatura belgesi", () => {
  it("fatura numarası ve ETTN deterministiktir", () => {
    expect(invoiceNumberFor(SRC.transactionId, SRC.createdAt)).toBe(
      invoiceNumberFor(SRC.transactionId, SRC.createdAt),
    );
    expect(invoiceNumberFor(SRC.transactionId, SRC.createdAt)).toMatch(/^TBG2026\d{8}$/);
    expect(ettnFor(SRC.transactionId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(ettnFor("txn_other")).not.toBe(ettnFor(SRC.transactionId));
  });

  it("matrahı sağlayıcı tutarlarından türetir, yeniden hesaplamaz", () => {
    const doc = buildInvoiceDocument(SRC);
    expect(doc.payableAmount).toBe(86.4);
    expect(doc.taxAmount).toBe(14.4);
    expect(doc.lineExtensionAmount).toBe(72);
    expect(doc.taxPercent).toBe(20);
    expect(doc.currency).toBe("EUR");
  });

  it("vergisiz işlemde oran sıfır kalır ve bölme hatası vermez", () => {
    const doc = buildInvoiceDocument({ ...SRC, total: 0, tax: 0 });
    expect(doc.taxPercent).toBe(0);
    expect(doc.lineExtensionAmount).toBe(0);
  });

  it("zorunlu UBL-TR alanlarını üretir", () => {
    const xml = buildUblTrXml(buildInvoiceDocument(SRC));
    for (const tag of [
      "<cbc:UBLVersionID>2.1</cbc:UBLVersionID>",
      "<cbc:CustomizationID>TR1.2</cbc:CustomizationID>",
      "<cbc:ProfileID>EARSIVFATURA</cbc:ProfileID>",
      "<cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>",
      "<cbc:TaxTypeCode>0015</cbc:TaxTypeCode>",
      'schemeID="VKN"',
      "cac:AccountingSupplierParty",
      "cac:AccountingCustomerParty",
      "cac:LegalMonetaryTotal",
      "cac:InvoiceLine",
    ]) {
      expect(xml).toContain(tag);
    }
    expect(xml).toContain('currencyID="EUR">86.40</cbc:PayableAmount>');
  });

  it("XML ve HTML çıktısında özel karakterleri kaçırır", () => {
    const doc = buildInvoiceDocument({
      ...SRC,
      description: 'Pro & "Edge" <paket>',
      buyer: { email: "a&b@example.com" },
    });
    const xml = buildUblTrXml(doc);
    expect(xml).toContain("Pro &amp; &quot;Edge&quot; &lt;paket&gt;");
    expect(xml).not.toContain("<paket>");
    expect(buildArchiveHtml(doc)).toContain("a&amp;b@example.com");
  });

  it("e-Arşiv özeti tutarları ve sağlayıcı sorumluluğunu gösterir", () => {
    const html = buildArchiveHtml(buildInvoiceDocument(SRC));
    expect(html).toContain("86.40 EUR");
    expect(html).toContain("Merchant of Record");
  });

  it("vergi ön izlemesi yalnız tahmin olarak işaretlenir", () => {
    const preview = previewTax(72, "TR");
    expect(preview.estimated).toBe(true);
    expect(preview.gross).toBe(86.4);
    expect(previewTax(72, "DE", { b2bReverseCharge: true }).tax).toBe(0);
  });
});
