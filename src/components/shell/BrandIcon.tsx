/**
 * MARKA SİMGESİ (BrandIcon)
 * ------------------------------------------------------------------
 * Harici web hedefleri için ağdan favicon çekilmez. CDN ve üçüncü taraf
 * logo servisi olmadan, alan adına göre yerel SVG vektör amblemleri çizilir;
 * eşleşme yoksa çağıranın verdiği yedek simge gösterilir.
 */

import type { ReactNode } from "react";

/** Adresten alan adını çıkarır; geçersiz adreste boş döner. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Geriye dönük uyumluluk: uzak URL değil, yerel veri URI'si döner. */
export function brandLogoUrl(domain: string): string {
  const label = brandKey(domain) ?? "tb";
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>${label}</title><rect width="64" height="64" rx="16" fill="%230f9d76"/></svg>`)}`;
}

type BrandKey =
  | "duckduckgo"
  | "google"
  | "youtube"
  | "x"
  | "linkedin"
  | "tiktok"
  | "osm"
  | "wikipedia"
  | "tuta"
  | "mozilla"
  | "blockscout"
  | "ipfs"
  | "coingecko"
  | "github"
  | "spotify"
  | "whatsapp"
  | "hn"
  | "topomap"
  | "openlibrary"
  | "arxiv"
  | "dontpad";

export function brandKey(domain: string): BrandKey | null {
  const d = domain.toLowerCase().replace(/^www\./, "");
  if (d.includes("duckduckgo")) return "duckduckgo";
  if (d.includes("google")) return "google";
  if (d.includes("youtube") || d.includes("yewtu")) return "youtube";
  if (d === "x.com" || d.includes("twitter") || d.includes("nitter")) return "x";
  if (d.includes("linkedin")) return "linkedin";
  if (d.includes("tiktok")) return "tiktok";
  if (d.includes("openstreetmap")) return "osm";
  if (d.includes("wikipedia") || d.includes("wiktionary")) return "wikipedia";
  if (d.includes("tuta")) return "tuta";
  if (d.includes("mozilla")) return "mozilla";
  if (d.includes("blockscout")) return "blockscout";
  if (d.includes("ipfs")) return "ipfs";
  if (d.includes("coingecko")) return "coingecko";
  if (d.includes("github")) return "github";
  if (d.includes("spotify")) return "spotify";
  if (d.includes("whatsapp")) return "whatsapp";
  if (d.includes("ycombinator")) return "hn";
  if (d.includes("opentopomap")) return "topomap";
  if (d.includes("openlibrary")) return "openlibrary";
  if (d.includes("arxiv")) return "arxiv";
  if (d.includes("dontpad")) return "dontpad";
  return null;
}

export function hasLocalBrandIcon(domain: string): boolean {
  return brandKey(domain) !== null;
}

function BrandSvg({ kind, className }: { kind: BrandKey; className?: string }) {
  const common = { className: `object-contain ${className ?? ""}`, viewBox: "0 0 64 64" };
  switch (kind) {
    case "youtube":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="14" fill="var(--tb-brand-youtube)" />
          <path d="M26 20l18 12-18 12z" fill="var(--tb-brand-ink-light)" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-ink-dark)" />
          <path
            d="M37 15c2 6 6 9 12 10v8c-5 0-9-2-12-5v13c0 8-6 13-14 13-7 0-12-5-12-12s6-12 13-12c1 0 2 0 3 .3v8.1c-1-.4-2-.6-3-.6-3 0-5 2-5 5s2 5 5 5 5-2 5-6V15z"
            fill="var(--tb-brand-tiktok-cyan)"
          />
          <path
            d="M40 18c2 4 5 6 10 7v7c-5 0-9-2-13-5v14c0 8-6 13-14 13-4 0-8-2-10-5 2 1 4 2 7 2 8 0 14-5 14-13V18z"
            fill="var(--tb-brand-tiktok-rose)"
            opacity=".9"
          />
        </svg>
      );
    case "x":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-ink-dark)" />
          <path
            d="M18 16h9l8 11 10-11h5L37 31l14 17h-9l-9-12-11 12h-5l14-16zM24 20l21 24h2L26 20z"
            fill="var(--tb-brand-ink-light)"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="12" fill="var(--tb-brand-linkedin)" />
          <path
            d="M17 26h9v24h-9zm4.5-11a5 5 0 110 10 5 5 0 010-10zM30 26h8v3c2-2 4-4 9-4 7 0 11 5 11 14v11h-9V40c0-5-2-7-5-7-4 0-5 3-5 7v10h-9z"
            fill="var(--tb-brand-ink-light)"
          />
        </svg>
      );
    case "github":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-github)" />
          <path
            d="M32 12c-11 0-20 9-20 20 0 9 6 16 14 19 1 .2 1.4-.4 1.4-1v-4c-6 1-7-2-7-2-1-2-2-3-2-3-2-1 .1-1 .1-1 2 0 3 2 3 2 2 3 5 2 6 2 .2-1.4.8-2.3 1.4-2.8-5-.5-10-2.4-10-10 0-2.2.8-4 2-5.5-.2-.5-.9-2.6.2-5.4 0 0 1.7-.5 5.7 2.1a19 19 0 0110.4 0c4-2.6 5.7-2.1 5.7-2.1 1.1 2.8.4 4.9.2 5.4 1.3 1.5 2 3.3 2 5.5 0 7.6-5 9.5-10 10 .9.7 1.7 2.2 1.7 4.5V50c0 .6.4 1.2 1.4 1C46 48 52 41 52 32c0-11-9-20-20-20z"
            fill="var(--tb-brand-ink-light)"
          />
        </svg>
      );
    case "spotify":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-spotify)" />
          <path
            d="M20 25c8-3 19-2 25 2m-23 7c6-2 15-1 21 2m-18 7c5-1 11-.8 15 2"
            stroke="var(--tb-brand-spotify-ink)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-whatsapp)" />
          <path
            d="M32 13a18 18 0 00-15 28l-2 9 9-2a18 18 0 108-35z"
            fill="var(--tb-brand-ink-light)"
          />
          <path
            d="M25 22c-.5-1-1-1-2-1h-2c-.6 0-1 .2-1.5.8-1 1-2 2.5-2 5 0 7 7 14 15 17 6 2 9 1 11-1 .8-1 1.5-3 1.5-4s-.4-1-1-1.2l-6-2.8c-.8-.3-1.3-.2-1.8.5l-1.8 2.3c-.4.5-1 .6-1.7.3-4-1.8-7-4.4-8.7-8.2-.3-.7-.2-1.1.3-1.6l1.3-1.5c.4-.5.6-.8.8-1.4.2-.5.1-1-.1-1.4z"
            fill="var(--tb-brand-whatsapp)"
          />
        </svg>
      );
    case "google":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-ink-light)" />
          <path
            d="M51 33c0-1.4-.1-2.8-.4-4H32v8h10.6A10 10 0 0138 43l7 5c4-4 6-9 6-15z"
            fill="var(--tb-brand-google-blue)"
          />
          <path
            d="M32 52c6 0 10-2 14-5l-7-5c-2 1-4 2-7 2-5 0-10-4-12-9l-7 5c3 7 10 12 19 12z"
            fill="var(--tb-brand-google-green)"
          />
          <path
            d="M20 35a12 12 0 010-7l-7-5a20 20 0 000 17z"
            fill="var(--tb-brand-google-yellow)"
          />
          <path
            d="M32 20c3 0 6 1 8 3l6-6c-4-3-8-5-14-5-9 0-16 5-19 12l7 5c2-5 7-9 12-9z"
            fill="var(--tb-brand-google-red)"
          />
        </svg>
      );
    case "duckduckgo":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-duckduckgo)" />
          <circle cx="32" cy="32" r="18" fill="var(--tb-brand-ink-light)" />
          <path
            d="M24 31c1-7 5-12 10-12s8 4 7 11c4 1 7 3 7 7 0 5-6 9-15 9s-16-4-16-9c0-3 3-6 7-6z"
            fill="var(--tb-brand-duckduckgo-gold)"
          />
          <circle cx="28" cy="31" r="2" fill="var(--tb-brand-ink-dark)" />
          <circle cx="38" cy="31" r="2" fill="var(--tb-brand-ink-dark)" />
          <path d="M31 35h7l-4 4z" fill="var(--tb-brand-duckduckgo)" />
        </svg>
      );
    case "osm":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-osm-sky)" />
          <path d="M8 42l14-15 10 9 9-13 15 20v13H8z" fill="var(--tb-brand-osm-land)" />
          <circle cx="39" cy="26" r="12" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="5" />
          <path d="M48 35l9 10" stroke="var(--tb-brand-osm-ink)" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case "wikipedia":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-ink-light)" />
          <path d="M13 18h14v3l-4 1 10 24 7-17-3-7-4-1v-3h15v3l-4 1-12 29h-4L16 22l-3-1z" fill="var(--tb-brand-wikipedia)" />
        </svg>
      );
    case "tuta":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-tuta)" />
          <path d="M14 20h36v26H14z" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="4" />
          <path d="M16 23l16 13 16-13" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      );
    case "mozilla":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-mozilla)" />
          <path d="M13 42V22h7l6 10 6-10h7v20h-6V31l-7 10-7-10v11zM42 42V22h9v20z" fill="var(--tb-brand-ink-light)" />
        </svg>
      );
    case "blockscout":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-blockscout)" />
          <circle cx="30" cy="30" r="15" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="5" />
          <path d="M41 41l11 11M22 30h16M30 22v16" stroke="var(--tb-brand-ink-light)" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case "ipfs":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-ipfs)" />
          <path d="M32 11l19 11v21L32 54 13 43V22zM13 22l19 11 19-11M32 33v21" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="4" strokeLinejoin="round" />
          <circle cx="32" cy="11" r="3" fill="var(--tb-brand-ink-light)" />
        </svg>
      );
    case "coingecko":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-coingecko)" />
          <circle cx="32" cy="32" r="21" fill="var(--tb-brand-coingecko-light)" />
          <path d="M18 37c4-13 13-20 27-15-4 2-6 5-7 9 5 0 8 2 10 6-8 9-22 11-30 0z" fill="var(--tb-brand-coingecko-ink)" />
          <circle cx="35" cy="27" r="2.5" fill="var(--tb-brand-ink-dark)" />
        </svg>
      );
    case "hn":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-hn)" />
          <path d="M17 15h8l7 14 7-14h8L36 36v13h-8V36z" fill="var(--tb-brand-ink-light)" />
        </svg>
      );
    case "topomap":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-topo)" />
          <path d="M8 47c9-17 16-23 24-9 6-17 14-15 24 9" fill="none" stroke="var(--tb-brand-topo-ink)" strokeWidth="4" />
          <path d="M11 27c9-9 18-10 27-3s14 5 18 2M8 36c8-7 15-8 22-2" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="2" opacity=".8" />
        </svg>
      );
    case "openlibrary":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-library)" />
          <path d="M12 19c8-3 14-1 20 4v27c-6-5-12-7-20-4zM52 19c-8-3-14-1-20 4v27c6-5 12-7 20-4z" fill="var(--tb-brand-ink-light)" />
          <path d="M32 23v27" stroke="var(--tb-brand-library-ink)" strokeWidth="2" />
        </svg>
      );
    case "arxiv":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-arxiv)" />
          <path d="M17 16l15 17 15-17M17 48l15-15 15 15" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "dontpad":
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-brand-dontpad)" />
          <path d="M18 13h22l8 8v30H18z" fill="var(--tb-brand-ink-light)" />
          <path d="M40 13v10h8M24 31h18M24 38h15M24 45h10" fill="none" stroke="var(--tb-brand-dontpad)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common} aria-hidden>
          <rect width="64" height="64" rx="16" fill="var(--tb-accent)" />
          <circle cx="32" cy="32" r="18" fill="none" stroke="var(--tb-brand-ink-light)" strokeWidth="4" />
        </svg>
      );
  }
}

export function BrandIcon({
  domain,
  label,
  className,
  fallback,
}: {
  domain: string;
  label: string;
  className?: string;
  fallback: ReactNode;
}) {
  const kind = brandKey(domain);
  if (!kind) return <>{fallback}</>;
  return (
    <span
      role="img"
      aria-label={`${label} yerel SVG logosu`}
      className="inline-grid place-items-center"
    >
      <BrandSvg kind={kind} className={className} />
    </span>
  );
}
