/**
 * UYGULAMA SİMGELERİ
 * ------------------------------------------------------------------
 * Kimlikten simgeye tek eşleme noktası; masaüstü, Dock ve Mağaza aynı
 * yerel, CDN'siz ve kabuk temasıyla uyumlu premium SVG setini kullanır.
 */

import type { ReactNode } from "react";

import { BrandIcon, domainOf, hasLocalBrandIcon } from "@/components/shell/BrandIcon";
import { webApp } from "@/shell/web-apps";

type IconProps = { className?: string };

function Frame({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden>
      <rect x="8" y="8" width="48" height="48" rx="14" fill="var(--tb-accent)" opacity=".22" />
      <path
        d="M14 14h22c8 0 14 6 14 14v22H28c-8 0-14-6-14-14z"
        fill="var(--tb-accent-2)"
        opacity=".24"
      />
      <rect
        x="12"
        y="12"
        width="40"
        height="40"
        rx="11"
        fill="var(--tb-panel-solid)"
        opacity=".76"
      />
      {children}
      <path
        d="M18 15h18c7 0 12 5 12 12"
        fill="none"
        stroke="var(--tb-text)"
        strokeOpacity=".22"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SystemIcon({ id, className }: { id: string; className?: string }) {
  switch (id) {
    case "messenger":
      return (
        <Frame className={className}>
          <path
            d="M19 23h26v16H31l-8 7v-7h-4z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M25 29h14M25 34h9"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "calls":
      return (
        <Frame className={className}>
          <path
            d="M24 17l7 7-4 5c2 4 5 7 9 9l5-4 7 7-4 7c-12 1-28-15-27-27z"
            fill="var(--tb-accent)"
            opacity=".9"
          />
          <circle
            cx="43"
            cy="21"
            r="5"
            fill="var(--tb-panel-solid)"
            stroke="var(--tb-accent-2)"
            strokeWidth="3"
          />
        </Frame>
      );
    case "files":
      return (
        <Frame className={className}>
          <path d="M15 23h15l5 6h14v18H15z" fill="var(--tb-accent)" opacity=".78" />
          <path
            d="M15 29h34v18H15z"
            fill="var(--tb-panel-solid)"
            opacity=".9"
            stroke="var(--tb-accent)"
            strokeWidth="3"
          />
        </Frame>
      );
    case "media":
      return (
        <Frame className={className}>
          <rect
            x="17"
            y="18"
            width="30"
            height="28"
            rx="5"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path d="M29 26l11 7-11 7z" fill="var(--tb-accent-2)" />
        </Frame>
      );
    case "music":
      return (
        <Frame className={className}>
          <path d="M41 17v24a6 6 0 11-4-6V22l-15 4v18a6 6 0 11-4-6V23z" fill="var(--tb-accent)" />
          <path d="M22 23l19-5" stroke="var(--tb-text)" strokeOpacity=".45" strokeWidth="3" />
        </Frame>
      );
    case "store":
      return (
        <Frame className={className}>
          <path
            d="M18 27h28l-3 22H21z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M24 27c0-7 4-11 8-11s8 4 8 11"
            fill="none"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "computer":
      return (
        <Frame className={className}>
          <rect
            x="16"
            y="18"
            width="32"
            height="23"
            rx="4"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path
            d="M26 48h12M32 41v7"
            stroke="var(--tb-text)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "wallpaper":
      return (
        <Frame className={className}>
          <circle cx="32" cy="32" r="15" fill="none" stroke="var(--tb-accent)" strokeWidth="4" />
          <path
            d="M22 38c6-11 14-11 20 0"
            fill="none"
            stroke="var(--tb-accent-2)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "profile":
      return (
        <Frame className={className}>
          <circle cx="32" cy="25" r="7" fill="var(--tb-accent)" />
          <path
            d="M19 47c3-8 8-12 13-12s10 4 13 12"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "settings":
      return (
        <Frame className={className}>
          <circle cx="32" cy="32" r="7" fill="none" stroke="var(--tb-accent)" strokeWidth="4" />
          <path
            d="M32 14v7M32 43v7M14 32h7M43 32h7M19 19l5 5M40 40l5 5M45 19l-5 5M24 40l-5 5"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "sysinfo":
      return (
        <Frame className={className}>
          <circle cx="32" cy="32" r="16" fill="none" stroke="var(--tb-accent)" strokeWidth="4" />
          <path
            d="M32 29v13M32 22h.01"
            stroke="var(--tb-text)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "panel":
    case "yonetim":
      return (
        <Frame className={className}>
          <path
            d="M32 15l15 6v10c0 9-6 15-15 18-9-3-15-9-15-18V21z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M25 32l5 5 10-12"
            fill="none"
            stroke="var(--tb-text)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Frame>
      );
    case "transfer":
      return (
        <Frame className={className}>
          <path
            d="M18 22h16M29 17l6 5-6 5M46 42H30M35 37l-6 5 6 5"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Frame>
      );
    case "apps":
      return (
        <Frame className={className}>
          <path
            d="M18 18h11v11H18zM35 18h11v11H35zM18 35h11v11H18zM35 35h11v11H35z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="3.5"
          />
        </Frame>
      );
    case "news":
      return (
        <Frame className={className}>
          <rect
            x="17"
            y="17"
            width="30"
            height="31"
            rx="4"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path
            d="M24 26h16M24 33h16M24 40h9"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "mesh":
    case "relay":
      return (
        <Frame className={className}>
          <circle cx="20" cy="24" r="5" fill="var(--tb-accent)" />
          <circle cx="44" cy="24" r="5" fill="var(--tb-accent)" />
          <circle cx="32" cy="44" r="5" fill="var(--tb-accent-2)" />
          <path
            d="M24 26l16 0M23 28l7 12M41 28l-7 12"
            stroke="var(--tb-text)"
            strokeOpacity=".62"
            strokeWidth="3"
          />
        </Frame>
      );
    case "writer":
      return (
        <Frame className={className}>
          <path
            d="M21 14h18l7 7v29H21z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M38 15v8h8M26 31h12M26 38h14M26 45h8"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "sheets":
      return (
        <Frame className={className}>
          <rect
            x="18"
            y="17"
            width="28"
            height="30"
            rx="4"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path
            d="M18 28h28M18 38h28M28 17v30M38 17v30"
            stroke="var(--tb-text)"
            strokeOpacity=".6"
            strokeWidth="2"
          />
        </Frame>
      );
    case "slides":
      return (
        <Frame className={className}>
          <rect
            x="17"
            y="18"
            width="30"
            height="24"
            rx="4"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path
            d="M24 48h16M32 42v6M26 35l6-8 6 5 5-8"
            fill="none"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Frame>
      );
    case "pdf":
      return (
        <Frame className={className}>
          <path
            d="M22 15h16l7 7v27H22z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M25 41c7-14 9-14 14 0M28 35h8"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "notes":
      return (
        <Frame className={className}>
          <path
            d="M19 17h26v25l-8 8H19z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M37 42v8M26 27h12M26 34h10"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "organizer":
      return (
        <Frame className={className}>
          <rect
            x="18"
            y="19"
            width="28"
            height="28"
            rx="4"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path
            d="M24 15v8M40 15v8M18 29h28M25 37h4M35 37h4"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "terminal":
      return (
        <Frame className={className}>
          <rect
            x="17"
            y="19"
            width="30"
            height="26"
            rx="4"
            fill="var(--tb-brand-ink-dark)"
            opacity=".86"
          />
          <path
            d="M23 28l5 4-5 4M32 38h9"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Frame>
      );
    case "axiom":
      return (
        <Frame className={className}>
          <path
            d="M20 17h26L34 32l12 15H20l12-15z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="32" r="4" fill="var(--tb-text)" />
        </Frame>
      );
    case "limen":
      return (
        <Frame className={className}>
          <path
            d="M18 39c8-15 20-19 31-23M18 39c11-2 20 0 28 8M18 39l9-21 19 29"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="39" r="4" fill="var(--tb-accent-2)" />
          <circle cx="49" cy="16" r="4" fill="var(--tb-text)" opacity=".86" />
          <circle cx="46" cy="47" r="4" fill="var(--tb-text)" opacity=".86" />
        </Frame>
      );
    case "web.search":
    case "web.search.g":
      return (
        <Frame className={className}>
          <circle cx="29" cy="29" r="11" fill="none" stroke="var(--tb-accent)" strokeWidth="4" />
          <path d="M38 38l9 9" stroke="var(--tb-text)" strokeWidth="4" strokeLinecap="round" />
        </Frame>
      );
    case "web.video":
    case "web.social.tt":
      return (
        <Frame className={className}>
          <rect
            x="17"
            y="19"
            width="30"
            height="24"
            rx="5"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path d="M30 27l10 5-10 5z" fill="var(--tb-text)" />
        </Frame>
      );
    case "web.social.x":
    case "web.social.li":
      return (
        <Frame className={className}>
          <path
            d="M18 32h28M32 18v28M22 22l20 20M42 22L22 42"
            stroke="var(--tb-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "web.maps":
      return (
        <Frame className={className}>
          <path
            d="M32 15c-8 0-14 6-14 14 0 11 14 21 14 21s14-10 14-21c0-8-6-14-14-14z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <circle cx="32" cy="29" r="5" fill="var(--tb-text)" />
        </Frame>
      );
    case "web.docs":
    case "web.notes":
      return (
        <Frame className={className}>
          <path d="M22 16h20v32H22z" fill="none" stroke="var(--tb-accent)" strokeWidth="4" />
          <path
            d="M27 26h10M27 33h10M27 40h7"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
    case "web.mail":
      return (
        <Frame className={className}>
          <rect
            x="16"
            y="22"
            width="32"
            height="23"
            rx="4"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
          />
          <path
            d="M18 25l14 11 14-11"
            fill="none"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Frame>
      );
    case "web.translate":
      return (
        <Frame className={className}>
          <path
            d="M18 22h17M26 16v6M22 22c2 9 8 13 13 16M35 22c-2 8-8 13-15 17M36 47l8-20 8 20M40 39h8"
            stroke="var(--tb-accent)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Frame>
      );
    case "web3.explorer":
    case "web3.ipfs":
    case "web3.market":
      return (
        <Frame className={className}>
          <path
            d="M32 15l15 9v17l-15 8-15-8V24z"
            fill="none"
            stroke="var(--tb-accent)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M17 24l15 9 15-9M32 33v16"
            stroke="var(--tb-text)"
            strokeOpacity=".65"
            strokeWidth="3"
          />
        </Frame>
      );
    default:
      return (
        <Frame className={className}>
          <circle cx="32" cy="32" r="15" fill="none" stroke="var(--tb-accent)" strokeWidth="4" />
          <path
            d="M32 20v24M20 32h24"
            stroke="var(--tb-text)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </Frame>
      );
  }
}

export function isBrandApp(id: string): boolean {
  const web = webApp(id);
  if (!web) return false;
  return hasLocalBrandIcon(web.iconDomain ?? domainOf(web.url));
}

export function AppIcon({ id, className }: { id: string; className?: string }) {
  const fallback = <SystemIcon id={id} className={className} />;
  const web = webApp(id);
  if (!web) return fallback;
  // Harici hedeflerde ağdan favicon çekilmez; katalog alan adına göre
  // yerel SVG amblem kullanılır, eşleşme yoksa yedek simgeye düşülür.
  const domain = web.iconDomain ?? domainOf(web.url);
  return <BrandIcon domain={domain} label={web.label} className={className} fallback={fallback} />;
}
