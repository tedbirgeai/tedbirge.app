/**
 * PENCERE YÖNETİCİSİ REGRESYONLARI
 * ------------------------------------------------------------------
 * Yeni pencereler deterministik boş alana/kademeye düşer; odak katmanı
 * her zaman tek aktif pencereyi en üste taşır.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  activeWindow,
  closeAllWindows,
  focusWindow,
  getWindows,
  minimizeWindow,
  openWindow,
  resetWindowManagerForTest,
  restoreWindow,
  setWindowViewportForTest,
} from "@/shell/windows";

describe("WindowManager", () => {
  beforeEach(() => {
    resetWindowManagerForTest();
    setWindowViewportForTest({ width: 1440, height: 900 });
  });

  it("yeni pencereleri aynı noktaya yığmadan açar", () => {
    openWindow("writer", "Writer");
    openWindow("sheets", "Sheets");
    openWindow("slides", "Slides");

    const boxes = getWindows().map((w) => `${w.x}:${w.y}:${w.w}:${w.h}`);
    expect(new Set(boxes).size).toBe(3);
    for (const win of getWindows()) {
      expect(win.x).toBeGreaterThanOrEqual(10);
      expect(win.y).toBeGreaterThanOrEqual(10);
      expect(win.x + win.w).toBeLessThanOrEqual(1430);
      expect(win.y + win.h).toBeLessThanOrEqual(818);
    }
  });

  it("odaklanan pencereyi katı biçimde en üste taşır", () => {
    const a = openWindow("writer", "Writer");
    const b = openWindow("sheets", "Sheets");
    const c = openWindow("slides", "Slides");

    expect(activeWindow()?.id).toBe(c);
    focusWindow(a);
    expect(activeWindow()?.id).toBe(a);

    const visibleZ = getWindows()
      .filter((w) => !w.minimized)
      .map((w) => w.z)
      .sort((x, y) => x - y);
    expect(visibleZ).toEqual([20, 22, 24]);
    expect(getWindows().find((w) => w.id === b)?.z).toBe(20);
  });

  it("küçültme ve geri getirme aktif katmanı bozmadan çalışır", () => {
    const a = openWindow("writer", "Writer");
    const b = openWindow("sheets", "Sheets");

    minimizeWindow(b);
    expect(activeWindow()?.id).toBe(a);
    restoreWindow(b);
    expect(activeWindow()?.id).toBe(b);

    closeAllWindows();
    expect(getWindows()).toHaveLength(0);
  });
});
