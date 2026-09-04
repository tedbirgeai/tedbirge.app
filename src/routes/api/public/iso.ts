/**
 * BARE-METAL ISO İNDİRME ROTASI — DOĞRUDAN İKİLİ TESLİMAT
 * ------------------------------------------------------------------
 * Kullanıcı hiçbir şey derlemez. Bu rota, GitHub Actions hattında
 * üretilip GitHub Releases'a yüklenen en güncel `.iso` dosyasına
 * yönlendirir.
 *
 * Sıra:
 *   1) VITE_ISO_DOWNLOAD_URL (CDN/ayna) tanımlıysa oraya 302
 *   2) GitHub Releases `latest` içindeki .iso varlığına 302
 *   3) Hiçbiri yoksa 503 — sahte dosya ya da kurulum betiği ÜRETİLMEZ
 *
 * `?durum=1` ile aynı bilgi JSON olarak döner (arayüz bunu kullanır).
 */

import { createFileRoute } from "@tanstack/react-router";

type Asset = { name: string; browser_download_url: string; size: number };
type Release = { tag_name?: string; name?: string; assets?: Asset[] };

type Resolved = {
  ready: boolean;
  url: string;
  name: string;
  size: number;
  version: string;
  page: string;
};

function repo(): string {
  return (
    process.env["VITE_ISO_GITHUB_REPO"] ??
    process.env["ISO_GITHUB_REPO"] ??
    "tedbirgeai/tedbirge.app"
  ).trim();
}

async function latestFromGithub(): Promise<Resolved | null> {
  const slug = repo();
  const page = `https://github.com/${slug}/releases/latest`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "tedbirge-webos",
  };
  const token = process.env["GITHUB_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;

  for (const api of [
    `https://api.github.com/repos/${slug}/releases/latest`,
    `https://api.github.com/repos/${slug}/releases?per_page=5`,
  ]) {
    try {
      const res = await fetch(api, { headers });
      if (!res.ok) continue;
      const body = (await res.json()) as Release | Release[];
      const releases = Array.isArray(body) ? body : [body];
      for (const rel of releases) {
        const isos = (rel.assets ?? []).filter((a) => a.name.toLowerCase().endsWith(".iso"));
        // Sabit adlı imaj varsa o tercih edilir; yoksa ilk .iso varlığı.
        const asset =
          isos.find((a) => a.name.toLowerCase() === "tedbirge-webos-x86_64.iso") ?? isos[0];

        if (asset) {
          return {
            ready: true,
            url: asset.browser_download_url,
            name: asset.name,
            size: asset.size ?? 0,
            version: rel.tag_name ?? rel.name ?? "",
            page,
          };
        }
      }
    } catch {
      /* ağ hatası: bir sonraki adrese geçilir */
    }
  }
  return null;
}

async function resolve(): Promise<Resolved> {
  const page = `https://github.com/${repo()}/releases/latest`;
  const direct = (process.env["VITE_ISO_DOWNLOAD_URL"] ?? "").trim();
  if (direct) {
    return {
      ready: true,
      url: direct,
      name: direct.split("/").pop() || "tedbirge-webos-x86_64.iso",
      size: 0,
      version: "",
      page,
    };
  }
  const github = await latestFromGithub();
  return github ?? { ready: false, url: "", name: "", size: 0, version: "", page };
}

export const Route = createFileRoute("/api/public/iso")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const info = await resolve();

        if (url.searchParams.has("durum")) {
          return new Response(JSON.stringify(info), {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Cache-Control": "public, max-age=300",
            },
          });
        }

        if (info.ready) {
          return new Response(null, {
            status: 302,
            headers: { Location: info.url, "Cache-Control": "no-store" },
          });
        }

        return new Response(
          "Tedbirge® WebOS kurulum imajı henüz yayınlanmadı. " +
            `Güncel sürümler: ${info.page}`,
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
              "Retry-After": "3600",
            },
          },
        );
      },
    },
  },
});
