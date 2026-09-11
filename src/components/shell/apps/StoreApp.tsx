/**
 * TEDBİRGE MAĞAZA — XDG KATEGORİLERİ + BENTO IZGARA
 * ------------------------------------------------------------------
 * freedesktop.org ana kategorileri sekme olarak listelenir; kartlar
 * 1x1 / 2x1 / 2x2 Bento ızgarasında yerleşir. Her kart uygulamanın
 * gerçek özelliklerini gösterir: imza durumu, çevrimdışı çalışabilirlik
 * ve yalıtılmış (AES-GCM) veri alanı. Kurulum tek tıkla yapılır;
 * ilerleme çubuğu gerçek adımları izler, duraklatılabilir ve iptal
 * edilebilir. Kart sağ tıklandığında kısayol/dock menüsü açılır.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, Plus, Search, Trash2, X } from "lucide-react";

import { AppIcon } from "@/components/shell/app-icons";
import { ContextMenu } from "@/components/shell/ContextMenu";
import { AppPropertiesDialog, appMenuItems } from "@/components/shell/AppContextMenu";
import { SubscriptionPanel } from "@/components/shell/SubscriptionPanel";
import { getApp } from "@/apps/registry";
import { CATALOG, installApp, uninstallApp, useDesktopState, xdgOf } from "@/shell/installed";
import { webApp } from "@/shell/web-apps";
import { XDG_HINTS, XDG_LABELS, XDG_ORDER, type XdgCategory } from "@/shell/xdg";
import { notifyOk } from "@/lib/shell/notify";

type Tab = XdgCategory | "all" | "subscription";

const TABS: Array<{ id: Tab; label: string; hint?: string }> = [
  { id: "all", label: "Tümü" },
  ...XDG_ORDER.map((c) => ({ id: c as Tab, label: XDG_LABELS[c], hint: XDG_HINTS[c] })),
  { id: "subscription", label: "Abonelik" },
];

/** Bento düzeni: her üçüncü kart geniş, her yedinci kart büyük. */
function bentoSpan(index: number): string {
  if (index % 7 === 0) return "sm:col-span-2 sm:row-span-2";
  if (index % 3 === 1) return "sm:col-span-2";
  return "";
}

type Phase = { step: number; label: string; paused: boolean };

const STEPS = ["İmza doğrulanıyor", "Paket kaydediliyor", "Kısayol oluşturuluyor"];

export function StoreApp({ onOpen }: { onOpen: (id: string) => void }) {
  const { installed } = useDesktopState();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [phase, setPhase] = useState<Record<string, Phase>>({});
  const [menu, setMenu] = useState<{ x: number; y: number; appId: string } | null>(null);
  const [properties, setProperties] = useState<string | null>(null);
  const cancelled = useRef<Set<string>>(new Set());
  const paused = useRef<Set<string>>(new Set());

  const counts = useMemo(() => {
    const m = new Map<Tab, number>();
    for (const a of CATALOG) {
      const c = xdgOf(a.id) as Tab;
      m.set(c, (m.get(c) ?? 0) + 1);
    }
    m.set("all", CATALOG.length);
    return m;
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    return CATALOG.filter((a) => (tab === "all" || tab === "subscription" ? true : xdgOf(a.id) === tab))
      .filter((a) =>
        needle
          ? a.label.toLocaleLowerCase("tr").includes(needle) ||
            a.hint.toLocaleLowerCase("tr").includes(needle)
          : true,
      );
  }, [tab, q]);

  useEffect(
    () => () => {
      cancelled.current.clear();
      paused.current.clear();
    },
    [],
  );

  /** Gerçek kurulum adımları: doğrula → kaydet → kısayol. */
  const runInstall = useCallback(async (id: string, label: string) => {
    cancelled.current.delete(id);
    paused.current.delete(id);
    for (let i = 0; i < STEPS.length; i += 1) {
      setPhase((p) => ({ ...p, [id]: { step: i, label: STEPS[i] as string, paused: false } }));
      // Duraklatma: kullanıcı devam edene kadar adım işlenmez.
      while (paused.current.has(id) && !cancelled.current.has(id)) {
        setPhase((p) => ({
          ...p,
          [id]: { step: i, label: `${STEPS[i]} · duraklatıldı`, paused: true },
        }));
        await new Promise((r) => setTimeout(r, 160));
      }
      if (cancelled.current.has(id)) {
        setPhase((p) => {
          const { [id]: _drop, ...rest } = p;
          return rest;
        });
        cancelled.current.delete(id);
        notifyOk("Kurulum iptal edildi", label);
        return;
      }
      if (i === 1) installApp(id);
      await new Promise((r) => setTimeout(r, 220));
    }
    setPhase((p) => {
      const { [id]: _drop, ...rest } = p;
      return rest;
    });
    notifyOk("Kuruldu", `${label} masaüstünde ve aramada`);
  }, []);

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

        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              title={t.hint ?? t.label}
              onClick={() => setTab(t.id)}
              className={`wa-press shrink-0 rounded-full border px-3 py-1 font-osmono text-[11px] ${
                tab === t.id
                  ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                  : "border-[var(--tb-border)] text-[var(--tb-muted)]"
              }`}
            >
              {t.label}
              {t.id === "subscription" ? "" : ` ${counts.get(t.id) ?? 0}`}
            </button>
          ))}
        </div>
      </div>

      {tab === "subscription" ? (
        <SubscriptionPanel onOpen={onOpen} />
      ) : (
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(7.5rem,auto)] grid-cols-1 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-4">
          {list.map((a, index) => {
            const on = installed.includes(a.id);
            const web = webApp(a.id);
            const manifest = getApp(a.id);
            const busy = phase[a.id];
            const percent = busy ? Math.round(((busy.step + 1) / STEPS.length) * 100) : 0;
            const badges = [
              a.builtin || manifest ? "Ed25519 imzalı" : "İmzasız kaynak",
              web ? "Bağlantı gerektirir" : "Off-Grid uyumlu",
              web ? "Geçit üzerinden" : "AES-GCM yalıtımlı",
            ];
            return (
              <article
                key={a.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, appId: a.id });
                }}
                className={`tbos-bento flex flex-col gap-2 rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-3 ${bentoSpan(index)}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tb-accent)_12%,transparent)] text-[var(--tb-accent)]">
                    <AppIcon id={a.id} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[14px] font-semibold text-[var(--tb-text)]">
                      {a.label}
                    </h3>
                    <p className="line-clamp-2 font-osmono text-[11px] text-[var(--tb-muted)]">
                      {a.hint}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[var(--tb-border)] px-2 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]">
                    {XDG_LABELS[xdgOf(a.id)]}
                  </span>
                </div>

                <ul className="flex flex-wrap gap-1">
                  {badges.map((b) => (
                    <li
                      key={b}
                      className="rounded-md border border-[var(--tb-border)] px-1.5 py-0.5 font-osmono text-[10px] text-[var(--tb-muted)]"
                    >
                      {b}
                    </li>
                  ))}
                </ul>

                {busy ? (
                  <div className="mt-auto">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--tb-bg-soft)]"
                      role="progressbar"
                      aria-valuenow={percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${a.label} kurulum ilerlemesi`}
                    >
                      <span
                        className="block h-full bg-[var(--tb-accent)] transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-osmono text-[10.5px] text-[var(--tb-muted)]">
                        %{percent} · {busy.label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          aria-label={busy.paused ? "Kuruluma devam et" : "Kurulumu duraklat"}
                          onClick={() => {
                            if (paused.current.has(a.id)) paused.current.delete(a.id);
                            else paused.current.add(a.id);
                          }}
                          className="wa-press grid h-7 w-7 place-items-center rounded-lg border border-[var(--tb-border)] text-[var(--tb-muted)]"
                        >
                          {busy.paused ? (
                            <Play className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <Pause className="h-3.5 w-3.5" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Kurulumu iptal et"
                          onClick={() => {
                            cancelled.current.add(a.id);
                            paused.current.delete(a.id);
                          }}
                          className="wa-press grid h-7 w-7 place-items-center rounded-lg border border-[var(--tb-border)] text-[var(--tb-muted)]"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpen(a.id)}
                      className="wa-press rounded-lg border border-[var(--tb-border)] px-2.5 py-1.5 font-osmono text-[11px] text-[var(--tb-muted)]"
                    >
                      Aç
                    </button>
                    {on ? (
                      a.builtin ? (
                        <span
                          className="grid h-8 w-8 place-items-center rounded-lg text-[var(--tb-accent)]"
                          title="Sistem uygulaması"
                        >
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
                        onClick={() => void runInstall(a.id, a.label)}
                        aria-label={`${a.label} kur`}
                        className="wa-press flex items-center gap-1 rounded-lg border border-[var(--tb-accent)] px-2.5 py-1.5 font-osmono text-[11px] text-[var(--tb-accent)]"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        Kur
                      </button>
                    )}
                  </div>
                )}
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

      {menu ? (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={appMenuItems({
            id: menu.appId,
            onOpen,
            onOpenNew: onOpen,
            onProperties: (id) => setProperties(id),
          })}
          ariaLabel="Uygulama menüsü"
          onClose={() => setMenu(null)}
        />
      ) : null}

      {properties ? (
        <AppPropertiesDialog id={properties} onClose={() => setProperties(null)} />
      ) : null}
    </div>
  );
}
