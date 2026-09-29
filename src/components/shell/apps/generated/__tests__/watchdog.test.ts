import { describe, expect, it } from "vitest";

import { WATCHDOG_MS, runGuarded } from "@/components/shell/apps/generated/GeneratedAppRunner";

describe("kaynak koruma sigortası", () => {
  it("hızlı çağrıyı geçirir", () => {
    const r = runGuarded(() => 42);
    expect(r.value).toBe(42);
    expect(r.overrun).toBe(false);
  });

  it("sınırı aşan çağrıyı işaretler", () => {
    const r = runGuarded(() => {
      const end = performance.now() + 5;
      while (performance.now() < end) {
        /* kasıtlı meşgul döngü */
      }
      return 1;
    }, 1);
    expect(r.overrun).toBe(true);
  });

  it("varsayılan sınır 1500 ms", () => {
    expect(WATCHDOG_MS).toBe(1500);
  });
});
