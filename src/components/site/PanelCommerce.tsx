/**
 * PANEL — TİCARİLEŞTİRME BÖLÜMÜ
 * ------------------------------------------------------------------
 * Abonelik, lisans/API anahtarı, düğüm kotası ve plan yükseltme.
 * Ödeme akışı Paddle overlay checkout ile canlıdır (önizlemede test
 * ortamı). Renkler yalnız --tb-* değişkenlerinden okunur.
 */

import { useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { COMMUNITY_NODE_LIMIT, PLANS, type PlanKey } from "@/lib/paddle-catalog";
import { notifyError } from "@/lib/shell/notify";
import { openWindow } from "@/shell/windows";

type CommerceLicense = {
  id: string;
  plan: string;
  status: string;
  node_limit: number;
  license_key: string;
  current_period_end: string | null;
};

type CommerceSubscription = {
  product_id: string;
  price_id: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
} | null;

/** Abonelik, lisans/API anahtarı, kullanım limiti ve plan yönetimi. */
export function PanelCommerce({
  subscription,
  licenses,
  deviceCountByLicense,
  onOpenPortal,
  portalBusy,
}: {
  subscription: CommerceSubscription;
  licenses: CommerceLicense[];
  deviceCountByLicense: Record<string, number>;
  onOpenPortal: () => void;
  portalBusy: boolean;
}) {
  const { user } = useAuth();
  const { openCheckout } = usePaddleCheckout();
  const [busyPlan, setBusyPlan] = useState<PlanKey | null>(null);

  const activeSub =
    !!subscription &&
    ["active", "trialing", "past_due"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  async function upgrade(key: PlanKey) {
    if (!user) {
      notifyError("Oturum gerekli", "Yükseltme için önce hesabınıza giriş yapın.");
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
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-5">
        <p className="font-osmono text-[11px] uppercase tracking-[0.2em] text-[var(--tb-muted)]">
          Ticarileştirme
        </p>
        <h2 className="mt-2 text-[16px] font-semibold text-[var(--tb-text)]">
          Abonelik ve lisans yönetimi
        </h2>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-4">
            <p className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-muted)]">
              Mevcut plan
            </p>
            {subscription ? (
              <div className="mt-3 space-y-2 text-[13px]">
                <Row k="Ürün" v={subscription.product_id} />
                <Row k="Fiyat" v={subscription.price_id} />
                <Row k="Durum" v={activeSub ? "Aktif" : subscription.status} />
                <Row
                  k="Dönem sonu"
                  v={
                    subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleDateString("tr-TR")
                      : "—"
                  }
                />
                <Row
                  k="Yenileme"
                  v={subscription.cancel_at_period_end ? "dönem sonunda durur" : "otomatik"}
                />
                <button
                  type="button"
                  onClick={onOpenPortal}
                  disabled={portalBusy}
                  className="wa-press mt-2 min-h-12 w-full rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-text)] disabled:opacity-50"
                >
                  {portalBusy ? "Açılıyor…" : "Planı yönet · Fatura geçmişi"}
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-[13px] leading-relaxed text-[var(--tb-muted)]">
                  Şu anda <strong className="text-[var(--tb-text)]">Community</strong> planındasınız:{" "}
                  {COMMUNITY_NODE_LIMIT} düğüme kadar ücretsiz, topluluk desteği ve tam mesh
                  yeteneği.
                </p>
                <button
                  type="button"
                  onClick={() => openWindow("profile", "Profil ve Hesap")}
                  className="wa-press mt-3 min-h-12 w-full rounded-xl border border-[var(--tb-border)] px-4 font-osmono text-[12px] text-[var(--tb-muted)]"
                >
                  Profil ve Hesap penceresinde aç
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <PlanCard
              name="Community"
              price="Ücretsiz"
              current={!activeSub}
              points={[
                `${COMMUNITY_NODE_LIMIT} düğüm`,
                "Tüm taşıyıcı köprüleri",
                "Topluluk desteği",
                "Temel API limiti",
              ]}
            />
            <PlanCard
              name="Pro"
              price={`${PLANS.pro.unitPrice.month} € / düğüm / ay`}
              current={activeSub && subscription?.product_id === PLANS.pro.productId}
              points={[
                "6–24 düğüm kotası",
                "Öncelikli API limiti + webhook",
                "Kesinti/olay günlüğü ve uyum raporu",
                "E-posta desteği (1 iş günü)",
              ]}
              onUpgrade={() => void upgrade("pro")}
              busy={busyPlan === "pro"}
            />
            <PlanCard
              name="Enterprise"
              price={`${PLANS.enterprise.unitPrice.month} € / düğüm / ay`}
              current={activeSub && subscription?.product_id === PLANS.enterprise.productId}
              points={[
                "25+ düğüm ve organizasyon",
                "Öncelikli API limiti + webhook",
                "SLA'lı destek ve pilot mühendisliği",
                "Uyum raporlaması",
              ]}
              onUpgrade={() => void upgrade("enterprise")}
              busy={busyPlan === "enterprise"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-bg-soft)] p-5">
        <p className="font-osmono text-[11px] uppercase tracking-[0.2em] text-[var(--tb-muted)]">
          API anahtarları ve kullanım limitleri
        </p>
        {licenses.length === 0 ? (
          <p className="mt-3 text-[13px] text-[var(--tb-muted)]">
            Henüz lisans anahtarı üretilmedi. Abonelik başladığında anahtar burada görünür.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {licenses.map((l) => {
              const used = deviceCountByLicense[l.id] ?? 0;
              const pct = Math.min(100, Math.round((used / Math.max(1, l.node_limit)) * 100));
              return (
                <li
                  key={l.id}
                  className="rounded-2xl border border-[var(--tb-border)] bg-[var(--tb-panel-solid)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-osmono text-[11px] uppercase tracking-[0.15em] text-[var(--tb-accent)]">
                      {l.plan}
                    </span>
                    <span className="font-osmono text-[11px] text-[var(--tb-muted)]">
                      {l.status}
                    </span>
                  </div>
                  <KeyField value={l.license_key} />
                  <p className="mt-3 font-osmono text-[11px] text-[var(--tb-muted)]">
                    Düğüm kullanımı: {used} / {l.node_limit}
                  </p>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--tb-border)]">
                    <div
                      className="h-full rounded-full bg-[var(--tb-accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {l.current_period_end ? (
                    <p className="mt-2 font-osmono text-[10px] text-[var(--tb-muted)]">
                      Geçerlilik: {new Date(l.current_period_end).toLocaleDateString("tr-TR")}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KeyField({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3">
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
    <div
      className={`rounded-2xl border p-4 ${
        current
          ? "border-[var(--tb-accent)] bg-[color-mix(in_srgb,var(--tb-accent)_10%,transparent)]"
          : "border-[var(--tb-border)] bg-[var(--tb-panel-solid)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="font-osmono text-[12px] uppercase tracking-[0.2em] text-[var(--tb-text)]">
          {name}
        </p>
        {current ? (
          <span className="font-osmono text-[10px] uppercase tracking-[0.15em] text-[var(--tb-accent)]">
            mevcut plan
          </span>
        ) : null}
      </div>
      <p className="mt-1 font-osmono text-[11px] text-[var(--tb-muted)]">{price}</p>
      <ul className="mt-2 space-y-1.5 text-[13px] text-[var(--tb-muted)]">
        {points.map((p) => (
          <li key={p}>· {p}</li>
        ))}
      </ul>
      {onUpgrade && !current ? (
        <button
          type="button"
          onClick={onUpgrade}
          disabled={busy}
          className="wa-press mt-3 min-h-12 w-full rounded-xl bg-[var(--tb-accent)] px-4 font-osmono text-[12px] text-[var(--tb-bg)] disabled:opacity-60"
        >
          {busy ? "Ödeme ekranı açılıyor…" : `${name} paketine yükselt`}
        </button>
      ) : null}
    </div>
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
