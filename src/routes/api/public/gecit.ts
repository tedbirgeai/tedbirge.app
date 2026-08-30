/**
 * TEDBİRGE GEÇİDİ (salt-okunur web aktarıcı)
 * ------------------------------------------------------------------
 * Gömmeye kapalı ama herkese açık (oturum gerektirmeyen) hedefleri
 * WebOS penceresi içinde gösterebilmek için sunucu tarafında aktarır.
 *
 * Sıkı sınırlar:
 *  - yalnız izin listesindeki alan adları,
 *  - yalnız GET, yalnız https,
 *  - çerez/kimlik başlıkları hiçbir yöne taşınmaz,
 *  - yanıt boyutu ve süresi sınırlı,
 *  - X-Frame-Options / frame-ancestors temizlenir.
 */

import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_HOSTS = [
  "duckduckgo.com",
  "html.duckduckgo.com",
  "lite.duckduckgo.com",
  "wikipedia.org",
  "m.wikipedia.org",
  "openstreetmap.org",
  "blockscout.com",
  "ipfs.io",
  "coingecko.com",
  "nitter.net",
  "search.marcia.cc",
  "www.bing.com",
  "startpage.com",
  "www.ecosia.org",
  "hnrss.org",
  "news.ycombinator.com",
];

const MAX_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 12_000;

function hostAllowed(host: string): boolean {
  const h = host.toLowerCase();
  return ALLOWED_HOSTS.some((a) => h === a || h.endsWith(`.${a}`));
}

/** Aktarılan HTML içinde bağlantıların geçitten geçmesini sağlar. */
function rewriteHtml(html: string, target: URL): string {
  const base = `<base href="${target.origin}${target.pathname}">`;
  const shim = `<script>(function(){
    var P='/api/public/gecit?url=';
    function wrap(u){try{var a=new URL(u,location.href);if(a.protocol!=='https:')return null;return P+encodeURIComponent(a.href);}catch(e){return null;}}
    document.addEventListener('click',function(e){
      var el=e.target;while(el&&el.tagName!=='A')el=el.parentElement;
      if(!el||!el.href)return;var w=wrap(el.href);if(!w)return;
      e.preventDefault();location.href=w;
    },true);
    document.addEventListener('submit',function(e){
      var f=e.target;if(!f||f.method&&f.method.toLowerCase()==='post'){e.preventDefault();return;}
      e.preventDefault();
      try{var q=new URLSearchParams(new FormData(f)).toString();var u=new URL(f.action||location.href);u.search=q;var w=wrap(u.href);if(w)location.href=w;}catch(err){}
    },true);
  })();</script>`;
  const headIdx = html.search(/<head[^>]*>/i);
  if (headIdx === -1) return base + shim + html;
  const insertAt = html.indexOf(">", headIdx) + 1;
  return html.slice(0, insertAt) + base + shim + html.slice(insertAt);
}

export const Route = createFileRoute("/api/public/gecit")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).searchParams.get("url");
        if (!raw) return new Response("url gerekli", { status: 400 });

        let target: URL;
        try {
          target = new URL(raw);
        } catch {
          return new Response("geçersiz adres", { status: 400 });
        }
        if (target.protocol !== "https:" || !hostAllowed(target.hostname)) {
          return new Response("bu hedef geçitten geçemez", { status: 403 });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
          const upstream = await fetch(target.href, {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: {
              // Kimlik taşımayan sade istek: çerez, yetki ve referrer yok.
              "User-Agent": "Mozilla/5.0 (compatible; TedbirgeWebOS/1.0)",
              Accept: request.headers.get("accept") ?? "*/*",
              "Accept-Language": "tr,en;q=0.8",
            },
          });

          const type = upstream.headers.get("content-type") ?? "application/octet-stream";
          const headers = new Headers({
            "Content-Type": type,
            "Cache-Control": "public, max-age=60",
            "Cross-Origin-Resource-Policy": "same-origin",
            "Referrer-Policy": "no-referrer",
          });

          if (type.includes("text/html")) {
            const text = await upstream.text();
            if (text.length > MAX_BYTES) return new Response("içerik çok büyük", { status: 413 });
            return new Response(rewriteHtml(text, new URL(upstream.url)), {
              status: upstream.status,
              headers,
            });
          }

          const buf = await upstream.arrayBuffer();
          if (buf.byteLength > MAX_BYTES) return new Response("içerik çok büyük", { status: 413 });
          return new Response(buf, { status: upstream.status, headers });
        } catch {
          return new Response("hedefe ulaşılamadı", { status: 502 });
        } finally {
          clearTimeout(timer);
        }
      },
    },
  },
});
