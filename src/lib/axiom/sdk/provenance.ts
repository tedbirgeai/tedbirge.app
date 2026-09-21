/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * PAKET KÖKEN ROZETİ (PACKAGE PROVENANCE)
 * ------------------------------------------------------------------
 * Altı paket deposu için "STATUS: 200_PROVEN" rozeti üretir: rozet
 * metni, SVG gövdesi ve depoya yapıştırılabilir markdown. Rozet yalnız
 * kanıtlanmış kararda üretilir; başka kararda üretilmez.
 */

import { SEAL_PREFIX } from "@/lib/axiom/verify/seal";
import type { VerifyVerdict } from "@/lib/axiom/verify/types";

export type RegistryId = "npm" | "crates" | "pypi" | "maven" | "nuget" | "gopkg";

export const REGISTRIES: { id: RegistryId; label: string; host: string }[] = [
  { id: "npm", label: "npm", host: "npmjs.com" },
  { id: "crates", label: "crates.io", host: "crates.io" },
  { id: "pypi", label: "PyPI", host: "pypi.org" },
  { id: "maven", label: "Maven Central", host: "central.sonatype.com" },
  { id: "nuget", label: "NuGet", host: "nuget.org" },
  { id: "gopkg", label: "Go Packages", host: "pkg.go.dev" },
];

export type Badge = {
  registry: RegistryId;
  label: string;
  status: string;
  /** Rozetin dayandığı mühür (kanıtsız kararda null). */
  seal: string | null;
  svg: string;
  markdown: string;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Rozet üretir. Renkler gömülü SVG'de `currentColor` ile taşınır;
 * arayüzde tema token'ları geçerli kalır.
 */
export function makeBadge(
  registry: RegistryId,
  packageName: string,
  verdict: VerifyVerdict,
  seal: string | null,
): Badge | null {
  if (verdict !== "200_PROVEN" || !seal) return null;
  const meta = REGISTRIES.find((r) => r.id === registry);
  if (!meta) return null;
  const status = "STATUS: 200_PROVEN";
  const left = `${meta.label} · ${packageName}`;
  const width = 190 + left.length * 6;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="22" role="img" aria-label="${escapeXml(`${left} ${status}`)}">
  <rect width="${width}" height="22" rx="4" fill="none" stroke="currentColor" stroke-opacity="0.4"/>
  <text x="8" y="15" font-family="monospace" font-size="11" fill="currentColor">${escapeXml(left)}</text>
  <text x="${width - 8}" y="15" text-anchor="end" font-family="monospace" font-size="11" fill="currentColor">${escapeXml(status)}</text>
</svg>`;
  const markdown = `[![${left} — ${status}](https://tedbirge.app/api/public/v1/mcp/verify?badge=${registry}&pkg=${encodeURIComponent(packageName)})](https://tedbirge.app) \`${SEAL_PREFIX}\``;
  return { registry, label: meta.label, status, seal, svg, markdown };
}
