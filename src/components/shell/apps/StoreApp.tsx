/**
 * TEDBİRGE MAĞAZA
 * ------------------------------------------------------------------
 * Kendi penceresinde çalışan uygulama mağazası: kategori sekmeleri ve
 * arama ile katalog taranır, "Masaüstüne ekle" ile uygulama masaüstüne
 * ve Dock'a kalıcı olarak eklenir.
 */

import { useMemo, useState } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";

import { AppIcon } from "@/components/shell/app-icons";
import { SubscriptionPanel } from "@/components/shell/SubscriptionPanel";
import {
  CATALOG,
  CATEGORY_LABELS,
  installApp,
  uninstallApp,
  useDesktopState,
} from "@/shell/installed";
import type { AppCategory } from "@/shell/web-apps";

type Tab = AppCategory | "all" | "subscription";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "Tümü" },
  ...(Object.keys(CATEGORY_LABELS) as AppCategory[]).map((c) => ({
    id: c as Tab,
    label: CATEGORY_LABELS[c],
  })),
  { id: "subscription", label: "Abonelik" },
];

export function StoreApp({ onOpen }: { onOpen: (id: string) => void }) {
  const { installed } = useDesktopState();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return CATALOG.filter((a) => (tab === "all" ? true : a.category === tab)).filter((a) =>
      needle
        ? a.label.toLocaleLowerCase("tr").includes(needle) ||
          a.hint.toLocaleLowerCase("tr").includes(needle)
        : true,
    );
  }, [tab, q]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-[var(--tb-border)] p-3">
        {tab === "subscription" ? null : (
          <label className="flex items-center gap-2 rounded-xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--tb-muted)]" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Uygulama ara"
              aria-label="Uygulama ara"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--tb-text)] outline-none"
            />
          </label>
        )}

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`wa-press shrink-0 rounded-full border px-3 py-1 font-osmono text-[11px] ${
                tab === t.id
                  ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                  : "border-[var(--tb-border)] text-[var(--tb-muted)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "subscription" ? (
        <SubscriptionPanel onOpen={onOpen} />
      ) : (
      <div className="grid min-h-0 flex-1 grid-cols-1 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-2">


        {list.map((a) => {
          const on = installed.includes(a.id);
          return (
            <article
              key={a.id}
              className="flex items-center gap-3 rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-3"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tb-accent)_12%,transparent)] text-[var(--tb-accent)]">
                <AppIcon id={a.id} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[14px] font-semibold text-[var(--tb-text)]">
                  {a.label}
                </h3>
                <p className="truncate font-osmono text-[11px] text-[var(--tb-muted)]">{a.hint}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpen(a.id)}
                  className="wa-press rounded-lg border border-[var(--tb-border)] px-2.5 py-1.5 font-osmono text-[11px] text-[var(--tb-muted)]"
                >
                  Aç
                </button>
                {on ? (
                  a.builtin ? (
                    <span className="grid h-8 w-8 place-items-center rounded-lg text-[var(--tb-accent)]">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => uninstallApp(a.id)}
                      aria-label={`${a.label} kaldır`}
                      className="wa-press grid h-8 w-8 place-items-center rounded-lg text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => installApp(a.id)}
                    aria-label={`${a.label} masaüstüne ekle`}
                    className="wa-press flex items-center gap-1 rounded-lg border border-[var(--tb-accent)] px-2.5 py-1.5 font-osmono text-[11px] text-[var(--tb-accent)]"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Ekle
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {list.length === 0 ? (
          <p className="col-span-full py-8 text-center font-osmono text-[12px] text-[var(--tb-muted)]">
            Eşleşen uygulama yok.
          </p>
        ) : null}
        </div>
      )}
    </div>
  );

}
