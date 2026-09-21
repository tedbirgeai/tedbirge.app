/* Copyright (c) 2026 Tedbirge Labs / Tedbirge WebOS. All rights reserved.
 * AXIOM™ is a proprietary product and core engine of Tedbirge WebOS.
 * Unauthorized copying, distribution, or reverse engineering is strictly prohibited.
 * Official Hub: https://tedbirge.dev | https://tedbirge.app */

/**
 * DURMA (HALTING) VE PANİK KORUMASI
 * ------------------------------------------------------------------
 * Hiçbir doğrulama 500 ms'yi aşamaz. Süre dolarsa işlem kesilir ve
 * `504_EXECUTION_TIMEOUT` döner. WASM bellek çöküşü, `unreachable` ya da
 * beklenmeyen özel durumda `500_PANIC` döner.
 *
 * SIFIR GÜNLÜK KURALI: bu yollarda girdi metni, ara gösterim veya bellek
 * içeriği hiçbir yere yazılmaz; konsol çağrısı yoktur. Dışa yalnız
 * { verdict, ms, engine } düzeyinde bilgi taşınır.
 */

import { VERIFY_TIMEOUT_MS, type VerifyVerdict } from "@/lib/axiom/verify/types";

export type GuardOutcome<T> =
  | { ok: true; value: T; ms: number }
  | {
      ok: false;
      verdict: Extract<VerifyVerdict, "504_EXECUTION_TIMEOUT" | "500_PANIC">;
      ms: number;
    };

/** İş kendi bütçe kapısında durduysa bu işaret atılır: panik değil, zaman aşımı. */
export class DeadlineExceeded extends Error {
  constructor() {
    super("deadline");
    this.name = "DeadlineExceeded";
  }
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Zaman bütçesi denetçisi: uzun döngüler bu kapıyı yoklar. */
export function createDeadline(budgetMs: number = VERIFY_TIMEOUT_MS) {
  const start = now();
  return {
    start,
    expired: () => now() - start > budgetMs,
    elapsed: () => Math.round(now() - start),
  };
}

/** Sert zaman aşımı + panik yakalaması ile bir işi çalıştırır. */
export async function runGuarded<T>(
  task: (deadline: ReturnType<typeof createDeadline>) => Promise<T> | T,
  budgetMs: number = VERIFY_TIMEOUT_MS,
): Promise<GuardOutcome<T>> {
  const deadline = createDeadline(budgetMs);
  if (budgetMs <= 0) {
    return { ok: false, verdict: "504_EXECUTION_TIMEOUT", ms: deadline.elapsed() };
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), budgetMs);
  });
  try {
    const raced = await Promise.race([Promise.resolve().then(() => task(deadline)), timeout]);
    if (raced === "timeout") {
      return { ok: false, verdict: "504_EXECUTION_TIMEOUT", ms: deadline.elapsed() };
    }
    if (deadline.expired()) {
      return { ok: false, verdict: "504_EXECUTION_TIMEOUT", ms: deadline.elapsed() };
    }
    return { ok: true, value: raced as T, ms: deadline.elapsed() };
  } catch (err) {
    // Panik: özel durumun içeriği okunmaz, kopyalanmaz, kaydedilmez.
    if (err instanceof DeadlineExceeded) {
      return { ok: false, verdict: "504_EXECUTION_TIMEOUT", ms: deadline.elapsed() };
    }
    return { ok: false, verdict: "500_PANIC", ms: deadline.elapsed() };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
