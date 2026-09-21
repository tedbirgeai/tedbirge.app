/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved. */

import { beforeEach, describe, expect, it } from "vitest";

import {
  emptyLicenseRecord,
  FREE_DEVICE_LIMIT,
  LICENSE_SNOOZE_MS,
  licenseStateFor,
  loadLicense,
  saveLicense,
  shouldPrompt,
  tierForDevices,
} from "@/lib/axiom/license/policy";

describe("lisans ilkesi", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
  });

  it("5 cihaza kadar ücretsizdir, 6. cihazda abonelik gerekir", () => {
    expect(FREE_DEVICE_LIMIT).toBe(5);
    expect(licenseStateFor(0)).toBe("ok");
    expect(licenseStateFor(5)).toBe("ok");
    expect(licenseStateFor(6)).toBe("subscription_required");
  });

  it("cihaz sayısına uygun kademeyi seçer", () => {
    expect(tierForDevices(3).id).toBe("community");
    expect(tierForDevices(6).id).toBe("enterprise");
    expect(tierForDevices(500).id).toBe("operator");
  });

  it("sınır aşılmadan pencere açılmaz", () => {
    expect(shouldPrompt(5, emptyLicenseRecord())).toBe(false);
    expect(shouldPrompt(6, emptyLicenseRecord())).toBe(true);
  });

  it("erteleme süresi dolmadan yeniden açılmaz", () => {
    const now = 1_000_000;
    const rec = { ...emptyLicenseRecord(), dismissedAt: now };
    expect(shouldPrompt(6, rec, now + 1000)).toBe(false);
    expect(shouldPrompt(6, rec, now + LICENSE_SNOOZE_MS)).toBe(true);
  });

  it("talep işaretlendiğinde pencere tekrar açılmaz", () => {
    const rec = { ...emptyLicenseRecord(), requestedTier: "enterprise" as const };
    expect(shouldPrompt(9, rec)).toBe(false);
  });

  it("yerel kayıt okunup yazılır", () => {
    const saved = saveLicense({ peakDevices: 7 });
    expect(saved.peakDevices).toBe(7);
    expect(loadLicense().peakDevices).toBe(7);
  });
});
