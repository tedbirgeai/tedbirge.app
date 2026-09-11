/**
 * XDG KATEGORİ EŞLEMESİ + DOCK SABİTLEME TESTLERİ
 * ------------------------------------------------------------------
 * Katalogdaki her uygulamanın geçerli bir freedesktop.org kategorisi
 * olmalı; dock sabitleme listesi kalıcı ve tutarlı davranmalıdır.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { CATALOG, xdgOf } from "@/shell/installed";
import { XDG_LABELS, XDG_ORDER, xdgCategory } from "@/shell/xdg";
import {
  DEFAULT_SLOTS,
  MAX_PINS,
  dockPins,
  isPinned,
  movePin,
  pinApp,
  resetDockSlots,
  unpinApp,
} from "@/shell/dock-slots";

describe("XDG kategorileri", () => {
  it("her katalog kaydı geçerli bir ana kategoriye düşer", () => {
    for (const app of CATALOG) {
      const cat = xdgOf(app.id);
      expect(XDG_ORDER).toContain(cat);
      expect(XDG_LABELS[cat]).toBeTruthy();
    }
  });

  it("eski kategoriler XDG karşılıklarına taşınır", () => {
    expect(xdgCategory("bilinmeyen", "uretkenlik")).toBe("Office");
    expect(xdgCategory("bilinmeyen", "sosyal")).toBe("Network");
    expect(xdgCategory("bilinmeyen", "sistem")).toBe("System");
  });

  it("iletişim ve ofis uygulamaları doğru kategoride", () => {
    expect(xdgOf("messenger")).toBe("Network");
    expect(xdgOf("writer")).toBe("Office");
    expect(xdgOf("terminal")).toBe("Development");
  });

  it("sekiz ana kategori tanımlıdır", () => {
    expect(XDG_ORDER).toHaveLength(8);
  });
});

describe("Dock sabitleme", () => {
  beforeEach(() => {
    resetDockSlots();
  });

  it("varsayılan sabitlerle başlar", () => {
    expect(dockPins()).toEqual(DEFAULT_SLOTS);
  });

  it("yeni uygulama sabitlenir ve yinelenmez", () => {
    expect(pinApp("files")).toBe(true);
    expect(isPinned("files")).toBe(true);
    expect(pinApp("files")).toBe(false);
    expect(dockPins().filter((x) => x === "files")).toHaveLength(1);
  });

  it("sabitleme sınırı aşılmaz", () => {
    const extra = CATALOG.map((a) => a.id).filter((id) => !isPinned(id));
    for (const id of extra) pinApp(id);
    expect(dockPins().length).toBeLessThanOrEqual(MAX_PINS);
  });

  it("son sabit uygulama kaldırılamaz", () => {
    while (dockPins().length > 1) unpinApp(dockPins()[dockPins().length - 1] as string);
    expect(dockPins()).toHaveLength(1);
    expect(unpinApp(dockPins()[0] as string)).toBe(false);
  });

  it("sürükleyerek sıralama listeyi korur", () => {
    const before = dockPins();
    movePin(0, 2);
    const after = dockPins();
    expect(after).toHaveLength(before.length);
    expect(after[2]).toBe(before[0]);
    expect([...after].sort()).toEqual([...before].sort());
  });
});
