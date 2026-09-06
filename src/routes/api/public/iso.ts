/**
 * BARE-METAL ISO İNDİRME ROTASI — DOĞRUDAN İKİLİ TESLİMAT
 * ------------------------------------------------------------------
 * Kullanıcı hiçbir şey derlemez. Bu rota, GitHub Actions hattında
 * üretilip GitHub Releases'a yüklenen en güncel `.iso` dosyasına
 * yönlendirir.
 *
 * Yalnız aynı yayındaki doğrulanmış Debian manifesti, özeti ve dosya
 * boyutu birbiriyle eşleşen imaj kabul edilir. Eski Alpine varlıkları
 * veya doğrulanmamış CDN adresleri hiçbir zaman kullanıcıya sunulmaz.
 *
 * `?durum=1` ile aynı bilgi JSON olarak döner (arayüz bunu kullanır).
 */

import { createFileRoute } from "@tanstack/react-router";

type Asset = { name: string; browser_download_url: string; size: number };
type Release = { tag_name?: string; name?: string; assets?: Asset[] };
type Manifest = {
  schema?: number;
  product?: string;
  distribution?: string;
  codename?: string;
  architecture?: string;
  version?: string;
  commit?: string;
  asset?: string;
  sha256?: string;
  size?: number;
  validated?: boolean;
};

type Resolved = {
  ready: boolean;
  url: string;
  name: string;
  size: number;
  version: string;
  page: string;
  sha256: string;
  distribution: string;
  commit: string;
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
        const assets = rel.assets ?? [];
        const manifestAsset = assets.find((a) => a.name === "TEDBIRGE-ISO-MANIFEST.json");
        const sumsAsset = assets.find((a) => a.name === "SHA256SUMS");
        if (!manifestAsset || !sumsAsset) continue;

        const [manifestResponse, sumsResponse] = await Promise.all([
          fetch(manifestAsset.browser_download_url, { headers }),
          fetch(sumsAsset.browser_download_url, { headers }),
        ]);
        if (!manifestResponse.ok || !sumsResponse.ok) continue;
        const manifest = (await manifestResponse.json()) as Manifest;
        const sums = await sumsResponse.text();
        const asset = assets.find((a) => a.name === manifest.asset);
        const expectedLine = `${manifest.sha256}  ${manifest.asset}`;
        const valid =
          manifest.schema === 1 &&
          manifest.product === "Tedbirge WebOS" &&
          manifest.distribution === "Debian" &&
          manifest.codename === "bookworm" &&
          manifest.architecture === "x86_64" &&
          manifest.validated === true &&
          typeof manifest.commit === "string" &&
          manifest.commit !== "unknown" &&
          typeof manifest.sha256 === "string" &&
          /^[a-f0-9]{64}$/.test(manifest.sha256) &&
          typeof manifest.size === "number" &&
          manifest.size >= 524_288_000 &&
          asset?.size === manifest.size &&
          sums.split(/\r?\n/).includes(expectedLine);
        if (!valid || !asset) continue;

        return {
          ready: true,
          url: asset.browser_download_url,
          name: asset.name,
          size: asset.size,
          version: manifest.version ?? rel.tag_name ?? rel.name ?? "",
          page,
          sha256: manifest.sha256 ?? "",
          distribution: "Debian bookworm",
          commit: manifest.commit ?? "",
        };
      }
    } catch {
      /* ağ hatası: bir sonraki adrese geçilir */
    }
  }
  return null;
}

async function resolve(): Promise<Resolved> {
  const page = `https://github.com/${repo()}/releases/latest`;
  const github = await latestFromGithub();
  return (
    github ?? {
      ready: false,
      url: "",
      name: "",
      size: 0,
      version: "doğrulanıyor",
      page,
      sha256: "",
      distribution: "",
      commit: "",
    }
  );
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
              "Cache-Control": "no-store",
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
          "Tedbirge® WebOS kurulum imajı henüz yayınlanmadı. " + `Güncel sürümler: ${info.page}`,
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
