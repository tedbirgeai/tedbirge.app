/**
 * PROFİL & HESAP UYGULAMASI
 * ------------------------------------------------------------------
 * Üst bardaki profil ikonunun tek hedefi. Oturum, düğüm kimliği,
 * mevcut paket, lisans anahtarı, düğüm kotası ve ödeme akışları
 * (yükselt · planı yönet · fatura geçmişi) tek pencerede toplanır.
 * Renkler yalnız --tb-* değişkenlerinden okunur.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreditCard, ExternalLink, LogIn, RefreshCw, ShieldCheck } from "lucide-react";

import { WindowShell, WindowEmpty } from "@/components/shell/WindowShell";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { COMMUNITY_NODE_LIMIT, PLANS, type PlanKey } from "@/lib/paddle-catalog";
import { notifyError, notifyOk } from "@/lib/shell/notify";
import { describeNode } from "@/lib/node-runtime";
import { useShell } from "@/shell/shell-context";
import {
  consumeCheckoutSuccess,
  notifySubscriptionChanged,
  onSubscriptionChanged,
  scheduleSubscriptionRefresh,
} from "@/lib/subscription-refresh";
import { createPortalSession } from "@/utils/payments.functions";

type SubRow = {
  paddle_customer_id: string;
  paddle_subscription_id: string;
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
};

type LicenseRow = {
  id: string;
  plan: string;
  status: string;
  node_limit: number;
  license_key: string;
  current_period_end: string | null;
};

const ACTIVE_STATES = ["active", "trialing", "past_due"];

export function ProfileApp({ onOpen }: { onOpen?: (id: string) => void }) {
  const { user, loading: authLoading } = useAuth();
  const { node } = useShell();
  const nodeInfo = describeNode(node);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubRow | null>(null);
  const [licenses, setLicenses] = useState<LicenseRow[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [portalBusy, setPortalBusy] = useState(false);
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);
  const { openCheckout } = usePaddleCheckout();

  const load = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLicenses([]);
      setDeviceCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [subRes, licRes, devRes] = await Promise.all([
        supabase
          .from("subscriptions")
          .select(
            "paddle_customer_id, paddle_subscription_id, product_id, price_id, status, current_period_end, cancel_at_period_end",
          )
          .eq("user_id", user.id)
          .eq("environment", getPaddleEnvironment())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("licenses")
          .select("id, plan, status, node_limit, license_key, current_period_end")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("devices").select("id", { count: "exact", head: true }).eq("status", "active"),
      ]);

      if (subRes.error) throw new Error(subRes.error.message);
      if (licRes.error) throw new Error(licRes.error.message);

      setSubscription((subRes.data as SubRow | null) ?? null);
      setLicenses((licRes.data as LicenseRow[] | null) ?? []);
      setDeviceCount(devRes.count ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hesap bilgileri okunamadı.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load]);

  // Ödeme dönüşünde ve başka bir ekranda plan değiştiğinde kendini tazeler.
  useEffect(() => onSubscriptionChanged(() => void load()), [load]);

  useEffect(() => {
    if (!consumeCheckoutSuccess()) return;
    notifyOk("Ödeme alındı", "Lisansınız birkaç saniye içinde görünür.");
    return scheduleSubscriptionRefresh(() => void load());
  }, [load]);

  const activeSub = useMemo(
    () =>
      !!subscription &&
      ACTIVE_STATES.includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date()),
    [subscription],
  );

  const planLabel = !activeSub
    ? "Community (Ücretsiz)"
    : subscription?.product_id === PLANS.enterprise.productId
      ? "Enterprise"
      : subscription?.product_id === PLANS.pro.productId
        ? "Pro"
        : (subscription?.product_id ?? "—");

  const nodeLimit = licenses[0]?.node_limit ?? COMMUNITY_NODE_LIMIT;
  const quotaPct = Math.min(100, Math.round((deviceCount / Math.max(1, nodeLimit)) * 100));

  async function openPortal() {
    if (!subscription) return;
    setPortalBusy(true);
    try {
      const { url } = await createPortalSession({
        data: {
          customerId: subscription.paddle_customer_id,
          subscriptionId: subscription.paddle_subscription_id,
          environment: getPaddleEnvironment(),
        },
      });
      window.open(url, "_blank", "noopener");
      notifyOk("Faturalama portalı açıldı", "Yeni sekmede plan ve fatura geçmişi.");
    } catch {
      notifyError("Ödeme portalı açılamadı", "Bağlantınızı kontrol edip tekrar deneyin.");
    } finally {
      setPortalBusy(false);
    }
  }

  async function upgrade(key: PlanKey) {
    if (!user) {
      notifyError("Oturum gerekli", "Yükseltme için önce hesabınıza giriş yapın.");
      onOpen?.("settings");
      return;
    }
    const plan = PLANS[key];
    setBusyPlan(key);
    try {
      await openCheckout({
        priceId: plan.prices.month,
        quantity: plan.minNodes,
        ...(user.email ? { customerEmail: user.email } : {}),
        customData: { userId: user.id },
        successUrl: `${window.location.origin}/?checkout=success`,
      });
    } catch (err) {
      notifyError(
        "Ödeme ekranı açılamadı",
        err instanceof Error ? err.message : "Ödeme sağlayıcısına ulaşılamadı.",
      );
    } finally {
      setBusyPlan(null);
    }
  }

  return (
    <WindowShell
      title="Profil ve Hesap"
      subtitle={`${nodeInfo.text} · ${nodeInfo.directPeers} cihaz`}
      toolbar={
        <button
          type="button"
          onClick={() => void load()}
          aria-label="Yenile"
          className="wa-press grid min-h-12 min-w-12 place-items-center rounded-xl border border-[var(--tb-border)] text-[var(--tb-muted)]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      }
    >
      <div className="space-y-4 pb-16">
        {/* Kimlik */}
        <section className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-4">
          <p className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
            Kimlik
          </p>
          <div className="mt-3 space-y-2 text-[13px]">
            <Row k="Hesap" v={user?.email ?? "Yerel mod (oturum yok)"} />
            <Row k="Düğüm" v={node.nodeId ? node.nodeId.slice(0, 18) : "—"} />
            <Row k="Bağlantı" v={nodeInfo.text} />
          </div>
          {!user && !authLoading ? (
            <button
              type="button"
              onClick={() => onOpen?.("settings")}
              className="wa-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--tb-accent)] px-4 font-osmono text-[12px] text-[var(--tb-accent)]"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Ayarlar &gt; Hesap ile giriş yap
            </button>
          ) : null}
        </section>

        {/* Abonelik */}
        <section className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-4">
          <p className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
            Abonelik
          </p>

          {authLoading || loading ? (
            <p className="mt-3 font-osmono text-[12px] text-[var(--tb-muted)]">Yükleniyor…</p>
          ) : error ? (
            <p className="mt-3 text-[12px] text-[var(--tb-danger,#e5484d)]">{error}</p>
          ) : (
            <>
              <div className="mt-3 space-y-2 text-[13px]">
                <Row k="Paket" v={planLabel} />
                <Row k="Durum" v={activeSub ? "Aktif" : (subscription?.status ?? "Ücretsiz")} />
                <Row
                  k="Dönem sonu"
                  v={
                    subscription?.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("tr-TR")
                      : "—"
                  }
                />
                <Row
                  k="Yenileme"
                  v={subscription?.cancel_at_period_end ? "dönem sonunda durur" : "otomatik"}
                />
              </div>

              <div className="mt-3">
                <p className="font-osmono text-[11px] text-[var(--tb-muted)]">
                  Düğüm kotası: {deviceCount} / {nodeLimit}
                </p>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--tb-border)]">
                  <div
                    className="h-full rounded-full bg-[var(--tb-accent)]"
                    style={{ width: `${quotaPct}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={!subscription || portalBusy}
                  className="wa-press flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-text)] disabled:opacity-50"
                >
                  <CreditCard className="h-4 w-4" aria-hidden />
                  {portalBusy ? "Açılıyor…" : "Planı yönet · Fatura geçmişi"}
                </button>
              </div>
              {!subscription ? (
                <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">
                  Aboneliğiniz yok; fatura portalı abonelik başladığında açılır.
                </p>
              ) : null}
            </>
          )}
        </section>

        {/* Paketler */}
        <section className="space-y-2">
          <p className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
            Paketler
          </p>
          <PlanCard
            name="Community"
            price="Ücretsiz"
            current={!activeSub}
            points={[
              `${COMMUNITY_NODE_LIMIT} düğüme kadar`,
              "Tüm taşıyıcı köprüleri",
              "Topluluk desteği",
            ]}
          />
          <PlanCard
            name="Pro"
            price={`${PLANS.pro.unitPrice.month} € / düğüm / ay`}
            current={activeSub && subscription?.product_id === PLANS.pro.productId}
            points={["6–24 düğüm kotası", "Öncelikli API + webhook", "Kesinti ve uyum günlüğü"]}
            onUpgrade={() => void upgrade("pro")}
            busy={busyPlan === "pro"}
          />
          <PlanCard
            name="Enterprise"
            price={`${PLANS.enterprise.unitPrice.month} € / düğüm / ay`}
            current={activeSub && subscription?.product_id === PLANS.enterprise.productId}
            points={["25+ düğüm", "SLA'lı destek", "Organizasyon ve rol yönetimi"]}
            onUpgrade={() => void upgrade("enterprise")}
            busy={busyPlan === "enterprise"}
          />
        </section>

        {/* Lisanslar */}
        <section className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-4">
          <p className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
            Lisans anahtarları
          </p>
          {loading ? (
            <p className="mt-3 font-osmono text-[12px] text-[var(--tb-muted)]">Yükleniyor…</p>
          ) : licenses.length === 0 ? (
            <div className="mt-3">
              <WindowEmpty
                title="Lisans anahtarı yok"
                hint="Abonelik başladığında anahtar burada görünür."
              />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {licenses.map((l) => (
                <li
                  key={l.id}
                  className="rounded-xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-accent)]">
                      {l.plan}
                    </span>
                    <span className="font-osmono text-[11px] text-[var(--tb-muted)]">
                      {l.status}
                    </span>
                  </div>
                  <KeyField value={l.license_key} />
                  <p className="mt-2 font-osmono text-[11px] text-[var(--tb-muted)]">
                    Düğüm limiti: {l.node_limit}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--tb-border)] p-4">
          <p className="flex items-center gap-2 text-[13px] text-[var(--tb-text)]">
            <ShieldCheck className="h-4 w-4 text-[var(--tb-accent)]" aria-hidden />
            Ödemeler Paddle üzerinden alınır; kart bilgisi hiçbir zaman cihazınızda saklanmaz.
          </p>
          <button
            type="button"
            onClick={() => onOpen?.("panel")}
            className="wa-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-muted)]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Panel · lisans, düğüm ve saha yönetimi
          </button>
        </section>
      </div>
    </WindowShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--tb-muted)]">{k}</span>
      <span className="min-w-0 truncate font-osmono text-[12px] text-[var(--tb-text)]">{v}</span>
    </div>
  );
}

function PlanCard({
  name,
  price,
  current,
  points,
  onUpgrade,
  busy,
}: {
  name: string;
  price: string;
  current: boolean;
  points: string[];
  onUpgrade?: () => void;
  busy?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        current
          ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_10%,transparent)]"
          : "border-[var(--tb-border)] bg-[var(--tb-bg-soft)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-[var(--tb-text)]">{name}</h3>
        {current ? (
          <span className="font-osmono text-[10px] uppercase tracking-[0.15em] text-[var(--tb-accent)]">
            mevcut plan
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-osmono text-[12px] text-[var(--tb-muted)]">{price}</p>
      <ul className="mt-2 space-y-1 text-[12px] text-[var(--tb-muted)]">
        {points.map((p) => (
          <li key={p}>· {p}</li>
        ))}
      </ul>
      {onUpgrade && !current ? (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={busy}
          className="wa-press mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--tb-accent)] px-4 font-osmono text-[12px] text-[var(--tb-bg)] disabled:opacity-60"
        >
          {busy ? "Ödeme ekranı açılıyor…" : `${name} paketine yükselt`}
        </button>
      ) : null}
    </article>
  );
}

function KeyField({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2">
      <p className="break-all font-osmono text-[12px] text-[var(--tb-text)]">
        {shown
          ? value
          : `${value.slice(0, 6)}${"•".repeat(Math.max(0, value.length - 10))}${value.slice(-4)}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          className="wa-press min-h-12 rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[11px] text-[var(--tb-muted)]"
        >
          {shown ? "Gizle" : "Göster"}
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            } catch {
              notifyError("Kopyalanamadı", "Panoya erişim izni verilmedi.");
            }
          }}
          className="wa-press min-h-12 rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[11px] text-[var(--tb-muted)]"
        >
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}
