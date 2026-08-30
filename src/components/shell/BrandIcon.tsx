/**
 * MARKA SİMGESİ (BrandIcon)
 * ------------------------------------------------------------------
 * Harici web hedefleri için jenerik çizgi ikonu yerine servisin kendi
 * logosunu gösterir: adres alan adından türetilen yüksek çözünürlüklü
 * favicon. Görsel yüklenemezse (çevrimdışı ya da engelli) bileşen
 * sessizce yedek simgeye düşer.
 */

import { useState, type ReactNode } from "react";

/** Adresten alan adını çıkarır; geçersiz adreste boş döner. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function brandLogoUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`;
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
  const [broken, setBroken] = useState(false);
  if (!domain || broken) return <>{fallback}</>;
  return (
    <img
      src={brandLogoUrl(domain)}
      alt={`${label} logosu`}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={`rounded-[6px] object-contain ${className ?? ""}`}
    />
  );
}
