/**
 * HABER AKIŞI UCU
 * ------------------------------------------------------------------
 * Sabit izin listesindeki açık haber akışlarını (RSS/Atom) sunucu
 * tarafında çeker, sadeleştirir ve 10 dakika önbellekler. Cihaz
 * doğrudan dış siteye bağlanmaz; yalnız başlık, bağlantı, kaynak ve
 * tarih döner. Kullanıcı verisi toplanmaz.
 */

import { createFileRoute } from "@tanstack/react-router";

import { PUBLIC_READ_CORS } from "@/lib/cors";

type Topic = "gundem" | "teknoloji";

type Source = { name: string; url: string; topic: Topic };

const SOURCES: Source[] = [
  { name: "BBC Türkçe", url: "https://feeds.bbci.co.uk/turkce/rss.xml", topic: "gundem" },
  { name: "TRT Haber", url: "https://www.trthaber.com/sondakika.rss", topic: "gundem" },
  {
    name: "AA Güncel",
    url: "https://www.aa.com.tr/tr/rss/default?cat=guncel",
    topic: "gundem",
  },
  { name: "Webrazzi", url: "https://webrazzi.com/feed", topic: "teknoloji" },
  { name: "ShiftDelete", url: "https://shiftdelete.net/feed", topic: "teknoloji" },
  { name: "Hacker News", url: "https://news.ycombinator.com/rss", topic: "teknoloji" },
];

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  topic: Topic;
  ts: number;
};

const CACHE_MS = 10 * 60 * 1000;
let cache: { at: number; items: NewsItem[] } | null = null;

function decode(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m?.[1] ? decode(m[1]) : "";
}

function pickLink(block: string): string {
  const plain = pick(block, "link");
  if (plain.startsWith("http")) return plain;
  const href = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return href?.[1] ?? "";
}

function parse(xml: string, src: Source): NewsItem[] {
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/\1>/gi) ?? [];
  const out: NewsItem[] = [];
  for (const block of blocks.slice(0, 12)) {
    const title = pick(block, "title");
    const link = pickLink(block);
    if (!title || !link.startsWith("http")) continue;
    const dateRaw = pick(block, "pubDate") || pick(block, "updated") || pick(block, "published");
    const parsed = dateRaw ? Date.parse(dateRaw) : NaN;
    out.push({
      id: `${src.name}:${link}`,
      title: title.slice(0, 200),
      link,
      source: src.name,
      topic: src.topic,
      ts: Number.isFinite(parsed) ? parsed : Date.now(),
    });
  }
  return out;
}

async function fetchSource(src: Source): Promise<NewsItem[]> {
  try {
    const res = await fetch(src.url, {
      headers: { accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    return parse(await res.text(), src);
  } catch {
    return [];
  }
}

async function collect(): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.items;
  const groups = await Promise.all(SOURCES.map(fetchSource));
  const seen = new Set<string>();
  const items = groups
    .flat()
    .filter((i) => (seen.has(i.link) ? false : (seen.add(i.link), true)))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 60);
  if (items.length > 0) cache = { at: Date.now(), items };
  return items.length > 0 ? items : (cache?.items ?? []);
}

export const Route = createFileRoute("/api/public/haberler")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: PUBLIC_READ_CORS }),
      GET: async () => {
        const items = await collect();
        return Response.json(
          { items, updatedAt: Date.now() },
          {
            headers: {
              ...PUBLIC_READ_CORS,
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      },
    },
  },
});
