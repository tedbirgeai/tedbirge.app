/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * LİSANS / YÜKSELTME PENCERESİ (MoR)
 * ------------------------------------------------------------------
 * 6. cihaz görüldüğünde veya manuel tetiklendiğinde açılır.
 * Cam görünüm yalnız --tb-* token'ları ile kurulur.
 * MoRPaymentAdapter entegrasyonu ile çevrimiçi ödeme ve lisans doğrulama sağlar.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, X, CreditCard, KeyCheck } from "lucide-react";

import { t } from "@/lib/axiom/i18n";
import {
  FREE_DEVICE_LIMIT,
  LICENSE_TIERS,
  saveLicense,
  tierForDevices,
  type LicenseTierId,
} from "@/lib/axiom/license/policy";
import { MoRPaymentAdapter, type LicenseTier } from "@/services/mor_payment_adapter";

export type LicenseModalProps = {
  open: boolean;
  peers: number;
  onClose: () => void;
  onSuccess?: (tier: LicenseTier) => void;
};

export function LicenseModal({ open, peers, onClose, onSuccess }: LicenseModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState<LicenseTierId | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const suggested = tierForDevices(peers).id;
  const adapter = MoRPaymentAdapter.getInstance();

  // Esc ile kapanır, odak pencerede kalır.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>("button, input");
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const later = useCallback(() => {
    saveLicense({ dismissedAt: Date.now(), peakDevices: peers });
    onClose();
  }, [onClose, peers]);

  const request = useCallback(
    async (tier: LicenseTierId) => {
      saveLicense({ requestedTier: tier, peakDevices: peers });
      setRequested(tier);
      setErrorMessage(null);

      // MoR Ödeme adaptör oturumu tetikleme
      try {
        setLoading(true);
        const mappedTier: LicenseTier =
          tier === "pro"
            ? "DEVELOPER_PRO"
            : tier === "enterprise"
            ? "ENTERPRISE_NODE"
            : "COMMUNITY";

        if (mappedTier !== "COMMUNITY") {
          const session = await adapter.createCheckoutSession(mappedTier);
          if (session?.checkoutUrl) {
            window.open(session.checkoutUrl, "_blank");
          }
        }
      } catch {
        setErrorMessage("Ödeme servisine bağlanırken bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    },
    [peers, adapter],
  );

  const handleActivateKey = useCallback(async () => {
    if (!licenseKeyInput.trim()) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await adapter.verifyLicenseKey(licenseKeyInput);
      if (result.isLicensed) {
        saveLicense({ requestedTier: result.tier.toLowerCase() as LicenseTierId, peakDevices: peers });
        if (onSuccess) onSuccess(result.tier);
        onClose();
      } else {
        setErrorMessage("Geçersiz veya süresi dolmuş AXIOM™ lisans anahtarı.");
      }
    } catch {
      setErrorMessage("Lisans doğrulama servisi ile bağlantı kurulamadı.");
    } finally {
      setLoading(false);
    }
  }, [licenseKeyInput, adapter, peers, onSuccess, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "color-mix(in srgb, var(--tb-bg) 70%, transparent)" }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("lic.title")}
        tabIndex={-1}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--tb-border)] p-4 shadow-2xl backdrop-blur-xl outline-none"
        style={{ background: "color-mix(in srgb, var(--tb-panel) 78%, transparent)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-rose-400)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              STATUS: SUBSCRIPTION_REQUIRED
            </div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--tb-text)]">{t("lic.title")}</h2>
            <p className="mt-1 font-osmono text-[11px] text-[var(--tb-muted)]">
              {t("lic.body")} · {peers} / {FREE_DEVICE_LIMIT}
            </p>
          </div>
          <button
            type="button"
            onClick={later}
            aria-label={t("lic.later")}
            className="rounded-lg border border-[var(--tb-border)] p-1 text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {LICENSE_TIERS.map((tier) => {
            const active = tier.id === suggested;
            return (
              <div
                key={tier.id}
                className="flex flex-col justify-between rounded-xl border p-3"
                style={{
                  borderColor: active ? "var(--tb-cyan-400)" : "var(--tb-border)",
                  background: "color-mix(in srgb, var(--tb-panel-soft) 85%, transparent)",
                }}
              >
                <div>
                  <div className="font-osmono text-[11px] uppercase tracking-wide text-[var(--tb-text)]">
                    {tier.label}
                  </div>
                  <div className="mt-1 font-osmono text-[11px] text-[var(--tb-muted)]">
                    {tier.devices === null
                      ? t("lic.unlimited")
                      : `${tier.devices} ${t("lic.devices")}`}{" "}
                    ·{" "}
                    {tier.monthlyUsd === 0 ? t("lic.free") : `$${tier.monthlyUsd}/${t("lic.month")}`}
                  </div>
                  <ul className="mt-2 space-y-1 font-osmono text-[10px] text-[var(--tb-muted)]">
                    {tier.features.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                </div>

                {tier.monthlyUsd > 0 ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => request(tier.id)}
                    className="mt-3 flex items-center justify-center gap-1 w-full rounded-lg border border-[var(--tb-cyan-400)] px-2 py-1 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-cyan-400)] hover:bg-[var(--tb-cyan-400)]/10 disabled:opacity-50"
                  >
                    <CreditCard className="h-3 w-3" />
                    {requested === tier.id ? t("lic.requested") : t("lic.request")}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* ZKP / Lisans Anahtarı Doğrulama Giriş Alanı */}
        <div
          className="mt-4 rounded-xl border border-[var(--tb-border)] p-3"
          style={{ background: "color-mix(in srgb, var(--tb-panel-soft) 50%, transparent)" }}
        >
          <label className="block font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-muted)] mb-1">
            AXIOM ZKP Lisans Anahtarı İle Etkinleştir
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
              placeholder="AXIOM-PRO-XXXX-XXXX-XXXX"
              className="flex-1 rounded-lg border border-[var(--tb-border)] bg-[var(--tb-bg)] px-3 py-1.5 font-osmono text-[11px] text-[var(--tb-text)] outline-none focus:border-[var(--tb-cyan-400)]"
            />
            <button
              type="button"
              disabled={loading || !licenseKeyInput.trim()}
              onClick={handleActivateKey}
              className="flex items-center gap-1 rounded-lg border border-[var(--tb-cyan-400)] bg-[var(--tb-cyan-400)]/20 px-3 py-1.5 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-cyan-400)] hover:bg-[var(--tb-cyan-400)]/30 disabled:opacity-50"
            >
              <KeyCheck className="h-3.5 w-3.5" />
              {loading ? "..." : "Etkinleştir"}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="mt-2 rounded-lg border border-[var(--tb-rose-400)] bg-[var(--tb-rose-400)]/10 px-3 py-1.5 font-osmono text-[10px] text-[var(--tb-rose-400)]"
          >
            {errorMessage}
          </p>
        ) : null}

        {requested && !errorMessage ? (
          <p
            role="status"
            className="mt-3 rounded-lg border border-[var(--tb-cyan-400)] px-3 py-2 font-osmono text-[10px] text-[var(--tb-cyan-400)]"
          >
            {t("lic.requestNote")}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-osmono text-[10px] text-[var(--tb-muted)]">
            {t("lic.testMode")}
          </span>
          <button
            type="button"
            onClick={later}
            className="rounded-lg border border-[var(--tb-border)] px-3 py-1 font-osmono text-[10px] uppercase tracking-wide text-[var(--tb-muted)] hover:text-[var(--tb-text)]"
          >
            {t("lic.later")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LicenseModal;
