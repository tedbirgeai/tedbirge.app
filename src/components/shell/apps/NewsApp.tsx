/**
 * HABERLER UYGULAMASI
 * ------------------------------------------------------------------
 * Gündem ve teknoloji başlıkları; kaynak ve zaman bilgisiyle. İnternet
 * kesildiğinde cihazdaki son liste gösterilir.
 */

import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw, WifiOff } from "lucide-react";

import { timeAgo, useNews, type NewsTopic } from "@/lib/news/feed";

const TABS: Array<{ id: NewsTopic | "all"; label: string }> = [
  { id: "all", label: "Tümü" },
  { id: "gundem", label: "Gündem" },
  { id: "teknoloji", label: "Teknoloji" },
];

export function NewsList({ limit, topicTabs = true }: { limit?: number; topicTabs?: boolean }) {
  const { items, loading, stale, refresh } = useNews();
  const [tab, setTab] = useState<NewsTopic | "all">("all");

  const rows = useMemo(() => {
    const list = tab === "all" ? items : items.filter((i) => i.topic === tab);
    return limit ? list.slice(0, limit) : list;
  }, [items, tab, limit]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1.5 pb-2">
        {topicTabs
          ? TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`wa-press rounded-full border px-3 py-1 font-osmono text-[11px] ${
                  tab === t.id
                    ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                    : "border-[var(--tb-border)] text-[var(--tb-muted)]"
                }`}
              >
                {t.label}
              </button>
            ))
          : null}
        <button
          type="button"
          onClick={refresh}
          aria-label="Haberleri yenile"
          className="wa-press ml-auto grid h-8 w-8 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
        </button>
      </div>

      {stale ? (
        <p className="mb-2 flex items-center gap-1.5 font-osmono text-[11px] text-[var(--tb-muted)]">
          <WifiOff className="h-3.5 w-3.5" aria-hidden />
          Bağlantı yok — cihazdaki son başlıklar gösteriliyor.
        </p>
      ) : null}

      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {rows.map((n) => (
          <li key={n.id}>
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-press flex items-start gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-2.5 hover:border-[var(--tb-accent)]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-snug text-[var(--tb-text)]">
                  {n.title}
                </span>
                <span className="mt-0.5 block font-osmono text-[11px] text-[var(--tb-muted)]">
                  {n.source} · {timeAgo(n.ts)}
                </span>
              </span>
              <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--tb-muted)]" />
            </a>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="py-6 text-center font-osmono text-[12px] text-[var(--tb-muted)]">
            {loading ? "Başlıklar yükleniyor…" : "Şu an gösterilecek haber yok."}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function NewsApp() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-3">
      <NewsList />
    </div>
  );
}
