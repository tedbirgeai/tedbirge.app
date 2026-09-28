import { describe, expect, it } from "vitest";
import { isKioskMode, KIOSK_READY_MARK, withReadyMark } from "@/lib/kiosk-ready";

describe("kiosk çizim sinyali", () => {
  it("yalnız ?kiosk=1 kipinde etkin", () => {
    expect(isKioskMode("?kiosk=1")).toBe(true);
    expect(isKioskMode("")).toBe(false);
    expect(isKioskMode("?kiosk=0")).toBe(false);
  });
  it("işaret bir kez eklenir", () => {
    const t = withReadyMark("Tedbirge® WebOS");
    expect(t).toContain(KIOSK_READY_MARK);
    expect(withReadyMark(t)).toBe(t);
  });
});
