/**
 * TEDBİRGE DAHİLİ WEB GÖRÜNÜMÜ
 * ------------------------------------------------------------------
 * Harici hedefler her zaman bu kabuk içinde açılır: üstte gezinme
 * çubuğu (yenile, adres, harici sekme), altta gömme konteynırı.
 * Hedef `X-Frame-Options`/CSP ile gömmeyi reddediyorsa tarayıcının
 * gri/kırmızı "bağlanmayı reddetti" ekranı ASLA gösterilmez: pencere
 * zengin **Tedbirge Web Kabuğu** kartına düşer.
 */

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Globe, Layers, RotateCw, Search, ShieldOff, Waypoints } from "lucide-react";

import { BrandIcon, domainOf } from "@/components/shell/BrandIcon";
import { GenericAppContainer } from "@/components/shell/GenericAppContainer";
import { gatewayAllowed, gatewayUrl } from "@/lib/shell/embed-strategy";
import { useNetworkMode } from "@/lib/shell/network-mode";
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
  const netMode = useNetworkMode();
  const offgrid = netMode === "offgrid";

  const active = forced ?? url;
  const proxyTarget = typeof proxy === "string" ? proxy : url;
  const canGateway = gatewayAllowed(proxyTarget) && !offgrid;
  /** Kullanıcı yalnız temiz alan adını görür; dahili geçit yolu gizlidir. */
  const viaGateway = Boolean(forced?.startsWith("/api/public/gecit"));
  const shownHost = domainOf(forced && !viaGateway ? forced : url);

  const runSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;
    setForced(SEARCH(q));
    setShell(false);
    setReload((r) => r + 1);
  }, [query]);

  const runGateway = useCallback(() => {
    setForced(gatewayUrl(proxyTarget));
    setShell(false);
    setReload((r) => r + 1);
  }, [proxyTarget]);

  const reset = useCallback(() => {
    setForced(null);
    setShell(embed === "popup");
    setReload((r) => r + 1);
  }, [embed]);

  // Tam Gizlilik kapanınca pencere kendi kendine tazelenir.
  useEffect(() => {
    if (!offgrid) reset();
  }, [offgrid, reset]);

  const shellCard = (
    <WebShell
      label={label}
      url={url}
      query={query}
      onQuery={setQuery}
      onSearch={runSearch}
      {...(canGateway ? { onGateway: runGateway } : {})}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-2 py-1.5">
        <button
          type="button"
          onClick={reset}
          aria-label="Yenile"
          title="Yenile"
          className="wa-press grid h-7 w-7 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <RotateCw className="h-4 w-4" aria-hidden />
        </button>
        <span className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel)] px-2 py-1">
          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--tb-accent)]" aria-hidden />
          <span className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">
            {offgrid
              ? "Tam Gizlilik · dış çıkış kapalı"
              : shell
                ? `Tedbirge Web Kabuğu · ${shownHost}`
                : shownHost}
          </span>
          {viaGateway && !offgrid ? (
            <span className="shrink-0 rounded-md border border-[var(--tb-accent)]/40 px-1.5 py-0.5 font-osmono text-[10px] text-[var(--tb-accent)]">
              Geçit
            </span>
          ) : null}
        </span>
        {canGateway ? (
          <button
            type="button"
            onClick={runGateway}
            title="Geçit Üzerinden Çalıştır"
            className="wa-press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--tb-accent)]/40 px-2 py-1 font-osmono text-[11px] text-[var(--tb-accent)]"
          >
            <Waypoints className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Geçit Üzerinden Çalıştır</span>
          </button>
        ) : null}
        {offgrid ? null : (
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
        )}
      </div>

      {offgrid ? (
        <OffgridCard label={label} url={url} />
      ) : shell ? (
        shellCard
      ) : (
        <GenericAppContainer
          key={`${reload}:${active}`}
          url={active}
          label={label}
          embed={forced ? "iframe" : embed}
          {...(forced ? {} : embedUrl ? { embedUrl } : {})}
          renderFailed={() => shellCard}
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
  onGateway?: () => void;
}) {
  const domain = domainOf(url);
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center">
      <BrandIcon
        domain={domain}
        label={label}
        className="h-12 w-12"
        fallback={
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]">
            <Layers className="h-6 w-6" aria-hidden />
          </span>
        }
      />
      <p className="text-[17px] font-semibold text-[var(--tb-text)]">{label}</p>
      <p className="max-w-md font-osmono text-[12px] text-[var(--tb-muted)]">
        Bu servis pencere içi gömmeyi kısıtlıyor. Aramanızı burada yapabilir ya da servisi
        harici sekmede açabilirsiniz.
      </p>

      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="wa-press inline-flex items-center gap-2 rounded-xl bg-[var(--tb-accent)] px-4 py-2 text-[13px] font-semibold text-[var(--tb-on-accent,var(--tb-bg))]"
      >
        <ExternalLink className="h-4 w-4" aria-hidden /> Harici Sekmede Aç
      </a>

      <div className="flex w-full max-w-md items-center gap-2 pt-1">
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

      {onGateway ? (
        <button
          type="button"
          onClick={onGateway}
          className="wa-press inline-flex items-center gap-2 rounded-lg border border-[var(--tb-border)] px-3 py-2 font-osmono text-[12px] text-[var(--tb-muted)]"
        >
          <Waypoints className="h-4 w-4" aria-hidden /> Geçit Üzerinden Çalıştır
        </button>
      ) : null}
    </div>
  );
}
