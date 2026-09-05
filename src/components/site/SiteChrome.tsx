/**
 * YASAL SAYFA KABUĞU
 * ------------------------------------------------------------------
 * Tedbirge tek kabuklu bir işletim sistemidir; pazarlama sitesi yoktur.
 * Geriye yalnızca yasal zorunluluk taşıyan belge sayfaları kalır
 * (/gizlilik, /kosullar, /iade, /ihracat-uyum, /yasal). Bu dosya o
 * sayfaların ince başlık/altbilgi çerçevesini sağlar.
 */

import type { ReactNode } from "react";

import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";

const LEGAL_LINKS = [
  { href: "/gizlilik", label: "Gizlilik" },
  { href: "/kosullar", label: "Koşullar" },
  { href: "/iade", label: "İade" },
  { href: "/ihracat-uyum", label: "İhracat uyumu" },
  { href: "/yasal", label: "Sözleşme ekleri" },
];

export function SitePage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex min-h-screen flex-col bg-background ${className}`}>
      <PaymentTestModeBanner />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <a href="/" className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
            ← Tedbirge® WebOS
          </a>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Yasal belge
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-6 py-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Mehmet DİNÇ (Tedbirge® WebOS)</span>
          {LEGAL_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{children}</p>;
}
