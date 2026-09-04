/**
 * ABONELİK PANELİ
 * ------------------------------------------------------------------
 * Mağaza penceresindeki "Abonelik" sekmesi. Community · Pro · Enterprise
 * paketleri, düğüm adedi ve aylık/yıllık seçimi ile ödeme akışını başlatır.
 * Ödeme dönüşünde lisans ve abonelik satırı otomatik tazelenir.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, LogIn, RefreshCw } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { COMMUNITY_NODE_LIMIT, PLANS, type PlanKey } from "@/lib/paddle-catalog";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import {
  consumeCheckoutSuccess,
  notifySubscriptionChanged,
  onSubscriptionChanged,
  scheduleSubscriptionRefresh,
} from "@/lib/subscription-refresh";

type Cycle = "month" | "year";

type SubRow = {
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

const ACTIVE_STATES = ["active", "trialing", "past_due"];

const STATUS_TR: Record<string, string> = {
  active: "Aktif",
  trialing: "Deneme sürümü",
  past_due: "Ödeme bekleniyor",
  paused: "Duraklatıldı",
  canceled: "İptal edildi",
};

export function SubscriptionPanel({ onOpen }: { onOpen?: (id: string) => void }) {
  const { user, loading: authLoading } = useAuth();
  const { openCheckout } = usePaddleCheckout();

  const [sub, setSub] = useState<SubRow | null>(null);
  const [nodeLimit, setNodeLimit] = useState(COMMUNITY_NODE_LIMIT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle>("month");
  const [nodes, setNodes] = useState<Record<PlanKey, number>>({
    pro: PLANS.pro.minNodes,
    enterprise: PLANS.enterprise.minNodes,
  });
  const [busy, setBusy] = useState<PlanKey | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setSub(null);
      setNodeLimit(COMMUNITY_NODE_LIMIT);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [subRes, licRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("product_id, price_id, status, current_period_end, cancel_at_period_end")
          .eq("user_id", user.id)
          .eq("environment", getPaddleEnvironment())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("licenses")
          .select("node_limit")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (subRes.error) throw new Error(subRes.error.message);
      setSub((subRes.data as SubRow | null) ?? null);
      setNodeLimit((licRes.data as { node_limit: number } | null)?.node_limit ?? COMMUNITY_NODE_LIMIT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abonelik bilgisi okunamadı.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  useEffect(() => onSubscriptionChanged(() => void load()), [load]);

  useEffect(() => {
    if (!consumeCheckoutSuccess()) return;
    notifyOk("Ödeme alındı", "Lisansınız birkaç saniye içinde görünür.");
    return scheduleSubscriptionRefresh(() => void load());
  }, [load]);

  const active = useMemo(
    () =>
      !!sub &&
      ACTIVE_STATES.includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date()),
    [sub],
  );

  async function buy(key: PlanKey) {
    if (!user) {
      notifyError("Giriş gerekli", "Önce Ayarlar > Hesap bölümünden giriş yapın.");
      onOpen?.("settings");
      return;
    }
    const plan = PLANS[key];
    const quantity = Math.min(plan.maxNodes, Math.max(plan.minNodes, nodes[key]));
    setBusy(key);
    try {
      await openCheckout({
        priceId: plan.prices[cycle],
        quantity,
        ...(user.email ? { customerEmail: user.email } : {}),
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/?checkout=success`,
      });
      notifySubscriptionChanged();
    } catch {
      notifyError("Ödeme ekranı açılamadı", "Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <section className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
            Mevcut durum
          </p>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Durumu yenile"
            className="wa-press grid h-8 w-8 place-items-center rounded-lg text-[var(--tb-muted)]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {authLoading || loading ? (
          <p className="mt-2 font-osmono text-[12px] text-[var(--tb-muted)]">Yükleniyor…</p>
        ) : error ? (
          <p className="mt-2 text-[12px] text-[var(--tb-danger,#e5484d)]">{error}</p>
        ) : !user ? (
          <button
            type="button"
            onClick={() => onOpen?.("settings")}
            className="wa-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--tb-accent)] px-4 font-osmono text-[12px] text-[var(--tb-accent)]"
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Satın almak için giriş yapın
          </button>
        ) : (
          <div className="mt-2 space-y-1 text-[13px] text-[var(--tb-text)]">
            <p className="font-osmono text-[12px]">
              Paket:{" "}
              {active && sub?.product_id === PLANS.enterprise.productId
                ? "Enterprise"
                : active && sub?.product_id === PLANS.pro.productId
                  ? "Pro"
                  : "Community (ücretsiz)"}
            </p>
            <p className="font-osmono text-[12px] text-[var(--tb-muted)]">
              Durum: {active ? "Aktif" : (sub ? (STATUS_TR[sub.status] ?? sub.status) : "Ücretsiz")}
              {sub?.cancel_at_period_end ? " · dönem sonunda durur" : ""}
            </p>
            <p className="font-osmono text-[12px] text-[var(--tb-muted)]">
              Düğüm hakkı: {nodeLimit}
            </p>
          </div>
        )}
      </section>

      <div className="flex items-center gap-1.5">
        {(["month", "year"] as Cycle[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={`wa-press rounded-full border px-3 py-1 font-osmono text-[11px] ${
              cycle === c
                ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)] text-[var(--tb-accent)]"
                : "border-[var(--tb-border)] text-[var(--tb-muted)]"
            }`}
          >
            {c === "month" ? "Aylık" : "Yıllık (2 ay hediye)"}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-4">
        <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">Community</h3>
        <p className="mt-1 font-osmono text-[12px] text-[var(--tb-muted)]">
          Ücretsiz · {COMMUNITY_NODE_LIMIT} düğüme kadar
        </p>
        <p className="mt-2 text-[12px] text-[var(--tb-muted)]">
          Tüm taşıyıcı köprüleri ve topluluk desteği dahildir.
        </p>
      </article>

      {(Object.keys(PLANS) as PlanKey[]).map((key) => {
        const plan = PLANS[key];
        const qty = nodes[key];
        const total = plan.unitPrice[cycle] * qty;
        const current = active && sub?.product_id === plan.productId;
        return (
          <article
            key={key}
            className={`rounded-2xl border p-4 ${
              current
                ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_10%,transparent)]"
                : "border-[var(--tb-border)] bg-[var(--tb-bg-soft)]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">{plan.label}</h3>
              {current ? (
                <span className="font-osmono text-[10px] uppercase tracking-[0.15em] text-[var(--tb-accent)]">
                  mevcut plan
                </span>
              ) : null}
            </div>
            <p className="mt-1 font-osmono text-[12px] text-[var(--tb-muted)]">
              {plan.unitPrice[cycle]} € / düğüm / {cycle === "month" ? "ay" : "yıl"} ·{" "}
              {plan.minNodes}–{plan.maxNodes} düğüm
            </p>

            <label className="mt-3 flex items-center gap-2">
              <span className="font-osmono text-[11px] text-[var(--tb-muted)]">Düğüm adedi</span>
              <input
                type="number"
                min={plan.minNodes}
                max={plan.maxNodes}
                value={qty}
                onChange={(e) =>
                  setNodes((n) => ({
                    ...n,
                    [key]: Math.min(
                      plan.maxNodes,
                      Math.max(plan.minNodes, Number(e.target.value) || plan.minNodes),
                    ),
                  }))
                }
                className="w-24 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] px-2 py-1.5 text-[13px] text-[var(--tb-text)] outline-none"
              />
            </label>

            <p className="mt-2 text-[13px] text-[var(--tb-text)]">
              Toplam: <strong>{total} €</strong> / {cycle === "month" ? "ay" : "yıl"}
            </p>

            <button
              type="button"
              onClick={() => void buy(key)}
              disabled={busy === key}
              className="wa-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--tb-accent)] px-4 font-osmono text-[12px] text-[var(--tb-bg)] disabled:opacity-60"
            >
              <CreditCard className="h-4 w-4" aria-hidden />
              {busy === key
                ? "Ödeme ekranı açılıyor…"
                : current
                  ? "Düğüm adedini güncelle"
                  : `${plan.label} paketini al`}
            </button>
          </article>
        );
      })}

      <p className="pb-2 text-center font-osmono text-[11px] text-[var(--tb-muted)]">
        Satıcı: Mehmet DİNÇ (Tedbirge® WebOS) · Ödemeler Paddle üzerinden alınır.
      </p>
    </div>
  );
}
