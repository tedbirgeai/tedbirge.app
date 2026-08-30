/**
 * TEDBİRGE DAHİLİ WEB GÖRÜNÜMÜ
 * ------------------------------------------------------------------
 * Harici hedefler her zaman bu kabuk içinde açılır: üstte gezinme
 * çubuğu (yenile, adres, geçit, harici sekme), altta çok aşamalı gömme
 * konteynırı. Hedef `X-Frame-Options`/CSP ile gömmeyi reddediyorsa
 * beyaz/kırmızı hata ekranı gösterilmez: pencere doğrudan **Tedbirge
 * Web Kabuğu** ile açılır; kullanıcı arama yapabilir ya da tek tıkla
 * geçit üzerinden gömmeyi deneyebilir.
 */

import { useCallback, useState } from "react";
import { ExternalLink, Globe, RotateCw, Search, ShieldCheck, Waypoints } from "lucide-react";

import { GenericAppContainer } from "@/components/shell/GenericAppContainer";
import { gatewayUrl } from "@/lib/shell/embed-strategy";
import type { EmbedPolicy } from "@/shell/web-apps";

const SEARCH = (q: string) => `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}`;

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
  /** Gömmeyi reddeden hedeflerde pencere web kabuğu ile açılır. */
  const [shell, setShell] = useState(embed === "popup");
  /** Geçit ya da arama sonucu geçici hedefi geçersiz kılar. */
  const [forced, setForced] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const active = forced ?? url;

  const runSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setForced(gatewayUrl(SEARCH(q)));
    setShell(false);
    setReload((r) => r + 1);
  }, [query]);

  const runGateway = useCallback(() => {
    setForced(gatewayUrl(url));
    setShell(false);
    setReload((r) => r + 1);
  }, [url]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            setForced(null);
            setShell(embed === "popup");
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
          <span className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">
            {shell ? `Tedbirge Web Kabuğu · ${url}` : active}
          </span>
        </span>
        <button
          type="button"
          onClick={runGateway}
          title="Geçit Üzerinden Çalıştır"
          className="wa-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--tb-accent)]/40 px-2 py-1 font-osmono text-[11px] text-[var(--tb-accent)]"
        >
          <Waypoints className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Geçit Üzerinden Çalıştır</span>
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          title="Harici sekmede aç"
          className="wa-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--tb-border)] px-2 py-1 font-osmono text-[11px] text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Harici Sekmede Aç</span>
        </a>
      </div>

      {shell ? (
        <WebShell
          label={label}
          url={url}
          query={query}
          onQuery={setQuery}
          onSearch={runSearch}
          onGateway={runGateway}
        />
      ) : (
        <GenericAppContainer
          key={`${reload}:${active}`}
          url={active}
          label={label}
          embed={forced ? "iframe" : embed}
          {...(forced ? {} : embedUrl ? { embedUrl } : {})}
          {...(forced ? {} : proxy ? { proxy } : {})}
          renderFailed={() => (
            <WebShell
              label={label}
              url={url}
              query={query}
              onQuery={setQuery}
              onSearch={runSearch}
              onGateway={runGateway}
            />
          )}
        />
      )}
    </div>
  );
}

/** Gömülemeyen hedeflerde pencere içinde çalışan yerel gezgin. */
function WebShell({
  label,
  url,
  query,
  onQuery,
  onSearch,
  onGateway,
}: {
  label: string;
  url: string;
  query: string;
  onQuery: (v: string) => void;
  onSearch: () => void;
  onGateway: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]">
        <ShieldCheck className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-[var(--tb-text)]">Tedbirge Web Kabuğu</p>
      <p className="max-w-md font-osmono text-[12px] text-[var(--tb-muted)]">
        {label} kendi sunucusunda pencere içinde gösterilmeyi kapatmış. Aramanızı burada
        yapabilir, hedefi geçit üzerinden çalıştırabilir ya da harici sekmede açabilirsiniz.
      </p>

      <div className="flex w-full max-w-md items-center gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-[var(--tb-muted)]" aria-hidden />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
            placeholder="Tedbirge ile ara"
            aria-label="Tedbirge ile ara"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--tb-text)] outline-none"
          />
        </label>
        <button
          type="button"
          onClick={onSearch}
          className="wa-press shrink-0 rounded-xl border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
        >
          Ara
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={onGateway}
          className="wa-press inline-flex items-center gap-2 rounded-lg border border-[var(--tb-accent)]/40 px-3 py-2 font-osmono text-[12px] text-[var(--tb-accent)]"
        >
          <Waypoints className="h-4 w-4" aria-hidden /> Geçit Üzerinden Çalıştır
        </button>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="wa-press inline-flex items-center gap-2 rounded-lg border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-muted)]"
        >
          <ExternalLink className="h-4 w-4" aria-hidden /> Harici Sekmede Aç
        </a>
      </div>
    </div>
  );
}
