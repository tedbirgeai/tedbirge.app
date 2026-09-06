/**
 * HABER AKIŞI — CİHAZ TARAFI
 * ------------------------------------------------------------------
 * Başlıklar kendi sunucumuzdaki izin listeli uçtan alınır, cihazda
 * saklanır ve internet kesildiğinde son alınan liste gösterilir.
 * 15 dakikada bir sessizce tazelenir.
 */

import { useEffect, useState } from "react";

export type NewsTopic = "gundem" | "teknoloji";

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  topic: NewsTopic;
  ts: number;
};

const KEY = "tedbirge.news.cache";
const REFRESH_MS = 15 * 60 * 1000;

type Cache = { at: number; items: NewsItem[] };

function readCache(): Cache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Cache) : null;
  } catch {
    return null;
  }
}

function writeCache(items: NewsItem[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), items } satisfies Cache));
  } catch {
    /* kota / özel mod */
  }
}

export async function fetchNews(): Promise<NewsItem[]> {
  const res = await fetch("/api/public/haberler", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("haber-alinamadi");
  const body = (await res.json()) as { items?: NewsItem[] };
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 0) writeCache(items);
  return items;
}

export type NewsState = {
  items: NewsItem[];
  loading: boolean;
  /** Ağ başarısız oldu, ekrandaki liste cihazdaki son kopyadır. */
  stale: boolean;
  updatedAt: number;
  refresh: () => void;
};

export function useNews(): NewsState {
  const cached = readCache();
  const [items, setItems] = useState<NewsItem[]>(cached?.items ?? []);
  const [updatedAt, setUpdatedAt] = useState(cached?.at ?? 0);
  const [loading, setLoading] = useState(!cached);
  const [stale, setStale] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(items.length === 0);
    fetchNews()
      .then((rows) => {
        if (!alive || rows.length === 0) return;
        setItems(rows);
        setUpdatedAt(Date.now());
        setStale(false);
      })
      .catch(() => {
        if (alive) setStale(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), REFRESH_MS);
    return () => window.clearInterval(id);
  }, []);

  return { items, loading, stale, updatedAt, refresh: () => setTick((t) => t + 1) };
}

export function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.round(diff / 60000);
  if (m < 1) return "az önce";
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} sa önce`;
  return new Date(ts).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}
