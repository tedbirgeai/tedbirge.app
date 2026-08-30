/**
 * TEDBİRGE DAHİLİ WEB GÖRÜNÜMÜ
 * ------------------------------------------------------------------
 * Harici hedefler her zaman bu kabuk içinde açılır: üstte gezinme
 * çubuğu (yenile, adres, harici sekme), altta çok aşamalı gömme
 * konteynırı. Hedef `X-Frame-Options`/CSP ile gömmeyi reddederse
 * kullanıcı beyaz ekranla değil, "Yerel Mod" kartı ve pencere içinde
 * çalışan arama kutusuyla karşılaşır.
 */

import { useCallback, useState } from "react";
import { ExternalLink, Globe, RotateCw, Search, ShieldAlert } from "lucide-react";

import { GenericAppContainer } from "@/components/shell/GenericAppContainer";
import { gatewayUrl } from "@/lib/shell/embed-strategy";
import type { EmbedPolicy } from "@/shell/web-apps";

export function TedbirgeWebView({
  url,
  label,
  embed = "auto",
  embedUrl,
  proxy,
}: {
  url: string;
  label: string;
  embed?: EmbedPolicy;
  embedUrl?: string;
  proxy?: string | true;
}) {
  const [reload, setReload] = useState(0);
  /** Yerel modda arama yapılınca hedef geçici olarak değiştirilir. */
  const [override, setOverride] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const active = override ?? url;

  const search = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setOverride(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`);
    setReload((r) => r + 1);
  }, [query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            setOverride(null);
            setReload((r) => r + 1);
          }}
          aria-label="Yenile"
          title="Yenile"
          className="wa-press grid h-7 w-7 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
        </button>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel)] px-2 py-1">
          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--tb-accent)]" aria-hidden />
          <span className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">{active}</span>
        </span>
        <a
          href={active}
          target="_blank"
          rel="noreferrer noopener"
          title="Harici sekmede aç"
          className="wa-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--tb-border)] px-2 py-1 font-osmono text-[11px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Harici sekmede aç</span>
        </a>
      </div>

      <GenericAppContainer
        key={`${reload}:${active}`}
        url={active}
        label={label}
        embed={override ? "iframe" : embed}
        {...(override ? {} : embedUrl ? { embedUrl } : {})}
        proxy={override ? active : proxy}
        renderFailed={(retry) => (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]">
              <ShieldAlert className="h-6 w-6" aria-hidden />
            </span>
            <p className="text-[15px] font-semibold text-[var(--tb-text)]">
              İçerik Yerel Modda Çalışıyor
            </p>
            <p className="max-w-md font-osmono text-[12px] text-[var(--tb-muted)]">
              {label} kendi sunucusunda pencere içinde gösterilmeyi kapatmış. Aramanızı burada
              yapabilir ya da hedefi harici sekmede açabilirsiniz.
            </p>

            <div className="flex w-full max-w-md items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[var(--tb-muted)]" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") search();
                  }}
                  placeholder="Tedbirge ile ara"
                  aria-label="Tedbirge ile ara"
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--tb-text)] outline-none"
                />
              </label>
              <button
                type="button"
                onClick={search}
                className="wa-press shrink-0 rounded-xl border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
              >
                Ara
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={retry}
                className="wa-press inline-flex items-center gap-2 rounded-lg border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-muted)]"
              >
                <RotateCw className="h-4 w-4" aria-hidden /> Tekrar dene
              </button>
              <a
                href={active}
                target="_blank"
                rel="noreferrer noopener"
                className="wa-press inline-flex items-center gap-2 rounded-lg border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden /> Harici sekmede aç
              </a>
            </div>
          </div>
        )}
      />

      <a
        href={gatewayUrl(active)}
        target="_blank"
        rel="noreferrer noopener"
        className="sr-only"
      >
        Geçit üzerinden aç
      </a>
    </div>
  );
}
