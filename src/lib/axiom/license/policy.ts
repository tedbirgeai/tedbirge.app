/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * OTONOM LİSANS İLKESİ (MoR)
 * ------------------------------------------------------------------
 * 1–5 cihaz ücretsizdir. 6. cihaz görüldüğünde durum
 * SUBSCRIPTION_REQUIRED olur ve yükseltme penceresi açılır. Bu katman
 * yalnız ilkeyi ve yerel erteleme kaydını tutar: ödeme sağlayıcısı
 * bağlı değildir, hiçbir tahsilat yapılmaz, kişisel veri yazılmaz.
 */

import { FREE_NODE_LIMIT } from "@/lib/axiom/net/node";

/** Ücretsiz cihaz sınırı tek doğruluk kaynağından okunur. */
export const FREE_DEVICE_LIMIT = FREE_NODE_LIMIT;

export const LICENSE_STORE_KEY = "axiom.license.v1";

/** Erteleme süresi: kapatılan pencere bu süre boyunca yeniden açılmaz. */
export const LICENSE_SNOOZE_MS = 24 * 60 * 60 * 1000;

export type LicenseTierId = "community" | "enterprise" | "operator";

export type LicenseTier = {
  id: LicenseTierId;
  label: string;
  /** Kapsanan cihaz sayısı ("sınırsız" için null). */
  devices: number | null;
  /** Aylık liste fiyatı (USD). Tahsilat yoktur; yalnız beyan edilen fiyattır. */
  monthlyUsd: number;
  features: string[];
};

export const LICENSE_TIERS: LicenseTier[] = [
  {
    id: "community",
    label: "Community",
    devices: FREE_DEVICE_LIMIT,
    monthlyUsd: 0,
    features: ["1–5 cihaz · ücretsiz", "Yerel doğrulama ve çevrimdışı kuyruk", "Topluluk desteği"],
  },
  {
    id: "enterprise",
    label: "Enterprise",
    devices: 50,
    monthlyUsd: 49,
    features: [
      "6–50 cihaz düğüm lisansı",
      "MCP uç noktası ve SDK adaptörleri",
      "Ölçümlü doğrulama defteri",
    ],
  },
  {
    id: "operator",
    label: "Operator",
    devices: null,
    monthlyUsd: 199,
    features: [
      "Sınırsız cihaz · operatör düğümü",
      "C-ABI soket köprüsü ve bare-metal imaj",
      "Öncelikli saha desteği",
    ],
  },
];

export type LicenseState = "ok" | "subscription_required";

/** Bağlı cihaz sayısına göre lisans durumu. */
export function licenseStateFor(peers: number): LicenseState {
  return peers > FREE_DEVICE_LIMIT ? "subscription_required" : "ok";
}

/** Verilen cihaz sayısını kapsayan en küçük kademe. */
export function tierForDevices(peers: number): LicenseTier {
  for (const tier of LICENSE_TIERS) {
    if (tier.devices === null || peers <= tier.devices) return tier;
  }
  return LICENSE_TIERS[LICENSE_TIERS.length - 1];
}

export type LicenseRecord = {
  /** Pencerenin son kapatıldığı an (epoch ms) ya da null. */
  dismissedAt: number | null;
  /** Kullanıcının yerel olarak işaretlediği yükseltme talebi. */
  requestedTier: LicenseTierId | null;
  /** Görülen en yüksek cihaz sayısı (yalnız sayı; kimlik yok). */
  peakDevices: number;
};

export function emptyLicenseRecord(): LicenseRecord {
  return { dismissedAt: null, requestedTier: null, peakDevices: 0 };
}

/** Yerel kaydı okur. Sunucu tarafında ve depolama kapalıysa boş kayıt döner. */
export function loadLicense(): LicenseRecord {
  if (typeof localStorage === "undefined") return emptyLicenseRecord();
  try {
    const raw = localStorage.getItem(LICENSE_STORE_KEY);
    if (!raw) return emptyLicenseRecord();
    const parsed = JSON.parse(raw) as Partial<LicenseRecord>;
    return {
      dismissedAt: typeof parsed.dismissedAt === "number" ? parsed.dismissedAt : null,
      requestedTier:
        parsed.requestedTier === "community" ||
        parsed.requestedTier === "enterprise" ||
        parsed.requestedTier === "operator"
          ? parsed.requestedTier
          : null,
      peakDevices: typeof parsed.peakDevices === "number" ? parsed.peakDevices : 0,
    };
  } catch {
    return emptyLicenseRecord();
  }
}

/** Yerel kaydı günceller ve yeni hâli döndürür. */
export function saveLicense(patch: Partial<LicenseRecord>): LicenseRecord {
  const next = { ...loadLicense(), ...patch };
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(LICENSE_STORE_KEY, JSON.stringify(next));
    } catch {
      /* depolama kapalı: kayıt yalnız bu oturumda geçerli olur */
    }
  }
  return next;
}

/**
 * Pencere açılmalı mı? Yalnız sınır aşıldığında ve erteleme süresi
 * dolduğunda açılır; böylece kullanıcı tekrar tekrar rahatsız edilmez.
 */
export function shouldPrompt(peers: number, record: LicenseRecord, now = Date.now()): boolean {
  if (licenseStateFor(peers) !== "subscription_required") return false;
  if (record.requestedTier) return false;
  if (record.dismissedAt === null) return true;
  return now - record.dismissedAt >= LICENSE_SNOOZE_MS;
}
