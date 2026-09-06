/**
 * MASAÜSTÜ HABER KARTI
 * ------------------------------------------------------------------
 * Ana ekranda güncel başlıkları gösterir; "Tümü" düğmesi Haberler
 * uygulamasını açar.
 */

import { Newspaper } from "lucide-react";

import { NewsList } from "@/components/shell/apps/NewsApp";

export function NewsCard({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <section className="tbos-window pointer-events-auto flex max-h-[300px] flex-col rounded-2xl p-3">
      <header className="mb-1 flex items-center gap-2">
        <Newspaper className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
        <span className="flex-1 font-osmono text-[11px] text-[var(--tb-muted)]">Haberler</span>
        <button
          type="button"
          onClick={() => onOpen("news")}
          className="wa-press rounded-lg border border-[var(--tb-border)] px-2 py-0.5 font-osmono text-[10.5px] text-[var(--tb-muted)]"
        >
          Tümü
        </button>
      </header>
      <NewsList limit={5} topicTabs={false} />
    </section>
  );
}
