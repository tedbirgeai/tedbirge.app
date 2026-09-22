/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * İZOLASYON KALKANI (AbortSignal · 500/750 ms)
 * ------------------------------------------------------------------
 * Köprüye giden her istek iptal edilebilir bir kalkanla sarılır:
 *   500 ms — yumuşak bütçe: istek iptal edilir, çağıran yerel motora düşer.
 *   750 ms — sert sınır: bağlantı kapatılıp yeniden kurulur.
 * Hiçbir durumda arayüz beklemede kalmaz ve girdi metni kaydedilmez.
 */

import { recordBridgeEvent } from "@/lib/axiom/bridge/events";
import { VERIFY_TIMEOUT_MS } from "@/lib/axiom/verify/types";

/** Yumuşak bütçe — doğrulama bütçesiyle aynı. */
export const SOFT_BUDGET_MS = VERIFY_TIMEOUT_MS;

/** Sert sınır — bütçenin 250 ms üstü. */
export const HARD_LIMIT_MS = VERIFY_TIMEOUT_MS + 250;

export type ShieldStage = "soft" | "hard";

export class BridgeAbortError extends Error {
  readonly stage: ShieldStage;
  constructor(stage: ShieldStage) {
    super(
      stage === "soft"
        ? "Çekirdek yanıt vermedi · yerel kapıya düşüldü."
        : "Çekirdek sert sınırı aştı · bağlantı yenileniyor.",
    );
    this.name = "BridgeAbortError";
    this.stage = stage;
  }
}

export type ShieldOptions = {
  softMs?: number;
  hardMs?: number;
  /** Sert sınırda çağrılır (bağlantıyı kapatıp yeniden kurmak için). */
  onHard?: () => void;
  /** Test edilebilirlik: zamanlayıcı enjeksiyonu. */
  schedule?: (fn: () => void, ms: number) => unknown;
  cancel?: (handle: unknown) => void;
};

/**
 * Görevi bütçe kalkanıyla çalıştırır. Görev iptal sinyalini dinleyerek
 * kendi kaynaklarını serbest bırakabilir.
 */
export function withAbortBudget<T>(
  task: (signal: AbortSignal) => Promise<T>,
  options: ShieldOptions = {},
): Promise<T> {
  const softMs = options.softMs ?? SOFT_BUDGET_MS;
  const hardMs = options.hardMs ?? HARD_LIMIT_MS;
  const schedule = options.schedule ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const cancel =
    options.cancel ?? ((h: unknown) => clearTimeout(h as ReturnType<typeof setTimeout>));

  const controller = new AbortController();
  let settled = false;
  let soft: unknown = null;
  let hard: unknown = null;

  const done = () => {
    settled = true;
    if (soft !== null) cancel(soft);
    if (hard !== null) cancel(hard);
  };

  return new Promise<T>((resolve, reject) => {
    soft = schedule(() => {
      if (settled) return;
      controller.abort();
      recordBridgeEvent("timeout", "TIMEOUT");
      reject(new BridgeAbortError("soft"));
    }, softMs);

    hard = schedule(
      () => {
        if (settled) return;
        settled = true;
        recordBridgeEvent("disconnected", "HARD_LIMIT");
        options.onHard?.();
        reject(new BridgeAbortError("hard"));
      },
      Math.max(hardMs, softMs),
    );

    task(controller.signal).then(
      (value) => {
        if (settled) return;
        done();
        resolve(value);
      },
      (err: unknown) => {
        if (settled) return;
        done();
        reject(err instanceof Error ? err : new Error("Köprü isteği başarısız."));
      },
    );
  });
}
