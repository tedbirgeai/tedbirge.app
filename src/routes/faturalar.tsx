/**
 * MÜŞTERİ FATURA SAYFASI
 * ------------------------------------------------------------------
 * Oturum sahibinin ödeme geçmişi; her kayıt için UBL-TR 2.1 XML ve
 * yazdırılabilir e-Arşiv özeti indirilebilir. Tahsilat ve yasal vergi
 * beyanı ödeme sağlayıcısındadır.
 */

import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, RefreshCw } from "lucide-react";

import { SectionLabel, SitePage } from "@/components/site/SiteChrome";
import { useAuth } from "@/hooks/useAuth";
import { listInvoicesFn, type InvoiceRecord } from "@/lib/invoices.functions";
import { buildArchiveHtml, buildInvoiceDocument, buildUblTrXml } from "@/lib/ubl-tr";

export const Route = createFileRoute("/faturalar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Faturalar ve Ödeme Geçmişi — tedbirge.app" },
      {
        name: "description",
        content:
          "Tedbirge® WebOS abonelik ödemelerinizin listesi; her ödeme için UBL-TR 2.1 fatura dosyası ve yazdırılabilir e-Arşiv özeti.",
      },
      { property: "og:title", content: "Faturalar ve Ödeme Geçmişi — tedbirge.app" },
      {
        property: "og:description",
        content: "Abonelik ödemeleri, UBL-TR 2.1 fatura dosyası ve e-Arşiv özeti.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Tedbirge® WebOS" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://tedbirge.app/faturalar" }],
  }),
  component: InvoicesPage,
});

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toDocument(row: InvoiceRecord) {
  return buildInvoiceDocument({
    transactionId: row.transactionId,
    createdAt: row.createdAt,
    currency: row.currency,
    total: row.total,
    tax: row.tax,
    description: row.description,
    buyer: { email: row.email },
  });
}

function InvoicesPage() {
  const { user, loading: authLoading } = useAuth();
  const fetchInvoices = useServerFn(listInvoicesFn);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authLoading) setReady(true);
  }, [authLoading]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["invoices", user?.id ?? "anon"],
    queryFn: () => fetchInvoices({ data: { limit: 50 } }),
    enabled: ready && !!user,
  });

  const rows = data ?? [];

  return (
    <SitePage>
      <section className="mx-auto max-w-4xl space-y-8 px-6 py-16">
        <div>
          <SectionLabel>Hesap</SectionLabel>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">Faturalar</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Abonelik ödemeleriniz burada listelenir. Her ödeme için UBL-TR 2.1 biçiminde fatura
            dosyası ve yazdırılabilir e-Arşiv özeti indirebilirsiniz.
          </p>
        </div>

        {authLoading ? (
          <p className="font-mono text-xs text-muted-foreground">Yükleniyor…</p>
        ) : !user ? (
          <div className="rounded-xl border border-border p-6">
            <p className="text-sm text-muted-foreground">
              Faturalarınızı görmek için uygulamadan giriş yapın.
            </p>
            <a
              href="/"
              className="mt-4 inline-flex items-center rounded-lg border border-primary px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-primary"
            >
              Uygulamaya git
            </a>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-xs text-muted-foreground">
                {isLoading ? "Kayıtlar okunuyor…" : `${rows.length} ödeme kaydı`}
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
                Yenile
              </button>
            </div>

            {error ? (
              <p className="text-sm text-destructive">
                Kayıtlar okunamadı. Bağlantınızı kontrol edip tekrar deneyin.
              </p>
            ) : null}

            {!isLoading && !rows.length ? (
              <p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
                Henüz bir ödeme kaydınız yok. Ücretsiz Community paketi fatura üretmez.
              </p>
            ) : null}

            <ul className="space-y-3">
              {rows.map((row) => {
                const doc = toDocument(row);
                return (
                  <li key={row.transactionId} className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="font-mono text-sm text-foreground">{doc.id}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {new Date(row.createdAt).toLocaleString("tr-TR")} · {row.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">
                          {doc.payableAmount.toFixed(2)} {doc.currency}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          KDV {doc.taxAmount.toFixed(2)} {doc.currency} · {row.status}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          download(`${doc.id}.xml`, "application/xml", buildUblTrXml(doc))
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        UBL-TR 2.1 XML
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          download(`${doc.id}.html`, "text/html", buildArchiveHtml(doc))
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                        e-Arşiv özeti
                      </button>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        ETTN {doc.ettn}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
              Tahsilat ve yasal vergi beyanı Paddle (Merchant of Record) tarafından yapılır. Buradaki
              belgeler kendi muhasebe kaydınız için standart biçimde üretilir.
            </p>
          </>
        )}
      </section>
    </SitePage>
  );
}
