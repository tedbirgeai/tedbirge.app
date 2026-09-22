import { beforeEach, describe, expect, it } from "vitest";

import { clearBridgeEvents, getBridgeEvents } from "@/lib/axiom/bridge/events";
import {
  BridgeAbortError,
  HARD_LIMIT_MS,
  SOFT_BUDGET_MS,
  withAbortBudget,
} from "@/lib/axiom/bridge/shield";

describe("izolasyon kalkanı", () => {
  beforeEach(() => clearBridgeEvents());

  it("bütçeler 500/750 ms olarak kilitlidir", () => {
    expect(SOFT_BUDGET_MS).toBe(500);
    expect(HARD_LIMIT_MS).toBe(750);
  });

  it("bütçe içinde tamamlanan isteği geçirir", async () => {
    await expect(withAbortBudget(() => Promise.resolve("tamam"))).resolves.toBe("tamam");
    expect(getBridgeEvents()).toHaveLength(0);
  });

  it("yumuşak bütçe aşılınca isteği iptal eder ve olay yazar", async () => {
    let aborted = false;
    const promise = withAbortBudget(
      (signal) =>
        new Promise<string>(() => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
        }),
      { softMs: 5, hardMs: 20 },
    );
    await expect(promise).rejects.toBeInstanceOf(BridgeAbortError);
    expect(aborted).toBe(true);
    expect(getBridgeEvents()[0]?.kind).toBe("timeout");
  });

  it("sert sınırda bağlantıyı yeniler", async () => {
    let reset = 0;
    const promise = withAbortBudget(() => new Promise<string>(() => undefined), {
      softMs: 5,
      hardMs: 15,
      onHard: () => {
        reset += 1;
      },
    });
    await promise.catch(() => undefined);
    await new Promise((r) => setTimeout(r, 40));
    expect(reset).toBe(1);
    expect(getBridgeEvents().some((e) => e.code === "HARD_LIMIT")).toBe(true);
  });

  it("görev hatasını olduğu gibi aktarır", async () => {
    await expect(withAbortBudget(() => Promise.reject(new Error("kapalı")))).rejects.toThrow(
      "kapalı",
    );
  });
});
