/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * MoR ödeme adaptörü — Paddle Overlay checkout ve sunucu tarafı lisans doğrulaması.
 * Sahte ödeme adresi veya önek tabanlı anahtar kabulü yoktur.
 */

import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { PLANS } from "@/lib/paddle-catalog";
import { supabase } from "@/integrations/supabase/client";
import { verifyLicenseKeyFn } from "@/lib/license-verify.functions";

export type LicenseTier = "COMMUNITY" | "DEVELOPER_PRO" | "ENTERPRISE_NODE" | "GOVERNMENT_SUITE";

export interface VerificationResult {
  isLicensed: boolean;
  tier: LicenseTier;
  licenseKey?: string;
  expiresAt?: number;
  nodeLimit?: number;
}

const STORAGE_KEY = "axiom_mor_license_state";

function tierFromPlan(plan: string): LicenseTier {
  if (plan === PLANS.enterprise.productId) return "ENTERPRISE_NODE";
  if (plan === PLANS.pro.productId) return "DEVELOPER_PRO";
  return "COMMUNITY";
}

export class MoRPaymentAdapter {
  private static instance: MoRPaymentAdapter;
  private currentTier: LicenseTier = "COMMUNITY";
  private activeLicenseKey?: string;
  private expiresAt?: number;

  private constructor() {
    this.loadStoredLicense();
  }

  public static getInstance(): MoRPaymentAdapter {
    if (!MoRPaymentAdapter.instance) MoRPaymentAdapter.instance = new MoRPaymentAdapter();
    return MoRPaymentAdapter.instance;
  }

  private loadStoredLicense(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as VerificationResult;
      if (data.isLicensed && (!data.expiresAt || data.expiresAt > Date.now())) {
        this.currentTier = data.tier;
        this.activeLicenseKey = data.licenseKey;
        this.expiresAt = data.expiresAt;
      } else {
        this.clearLicense();
      }
    } catch {
      /* depolama okunamadı */
    }
  }

  /** Paddle Overlay checkout açar. Oturum yoksa hata fırlatır. */
  public async openCheckout(
    tier: LicenseTier,
    options: { nodes: number; interval?: "month" | "year" },
  ): Promise<void> {
    const plan = tier === "ENTERPRISE_NODE" || tier === "GOVERNMENT_SUITE" ? PLANS.enterprise : PLANS.pro;
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) throw new Error("AUTH_REQUIRED");

    const quantity = Math.min(plan.maxNodes, Math.max(plan.minNodes, Math.round(options.nodes)));
    await initializePaddle();
    const priceId = await getPaddlePriceId(plan.prices[options.interval ?? "month"]);
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity }],
      customer: user.email ? { email: user.email } : undefined,
      customData: { userId: user.id, email: user.email ?? "" },
      settings: {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/?checkout=success`,
        allowLogout: false,
        variant: "one-page",
      },
    });
  }

  /** Anahtarı sunucuda, oturum sahibinin etkin lisanslarıyla karşılaştırır. */
  public async verifyLicenseKey(licenseKey: string): Promise<VerificationResult> {
    const res = await verifyLicenseKeyFn({ data: { licenseKey: licenseKey.trim() } });
    if (!res.valid) return { isLicensed: false, tier: "COMMUNITY" };
    const result: VerificationResult = {
      isLicensed: true,
      tier: tierFromPlan(res.plan),
      licenseKey: licenseKey.trim(),
      expiresAt: res.currentPeriodEnd ? Date.parse(res.currentPeriodEnd) : undefined,
      nodeLimit: res.nodeLimit,
    };
    this.applyLicense(result);
    return result;
  }

  private applyLicense(result: VerificationResult): void {
    this.currentTier = result.tier;
    this.activeLicenseKey = result.licenseKey;
    this.expiresAt = result.expiresAt;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
    } catch {
      /* kota */
    }
  }

  public clearLicense(): void {
    this.currentTier = "COMMUNITY";
    this.activeLicenseKey = undefined;
    this.expiresAt = undefined;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* yok */
    }
  }

  public getCurrentTier(): LicenseTier {
    return this.currentTier;
  }
  public getActiveLicenseKey(): string | undefined {
    return this.activeLicenseKey;
  }
  public getExpirationDate(): number | undefined {
    return this.expiresAt;
  }
}

export default MoRPaymentAdapter;
