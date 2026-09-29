/**
 * Müşteri fatura kayıtları. Yalnız oturum sahibinin ödeme işlemleri okunur;
 * kart/ödeme aracı verisi hiçbir zaman istemciye taşınmaz.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planByProductId } from "@/lib/paddle-catalog";

export type InvoiceRecord = {
  transactionId: string;
  createdAt: string;
  status: string;
  currency: string;
  total: number;
  tax: number;
  description: string;
  email: string;
};

export const listInvoicesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ limit: z.number().int().min(1).max(100).optional() })
      .optional()
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<InvoiceRecord[]> => {
    const limit = data?.limit ?? 50;
    const email = typeof context.claims.email === "string" ? context.claims.email : "";

    const [txnRes, subRes] = await Promise.all([
      context.supabase
        .from("payment_transactions")
        .select("paddle_transaction_id, created_at, status, currency, total, tax, subscription_id")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(limit),
      context.supabase
        .from("subscriptions")
        .select("paddle_subscription_id, product_id")
        .eq("user_id", context.userId),
    ]);

    if (txnRes.error) throw new Error(txnRes.error.message);

    const productBySub = new Map<string, string>();
    for (const row of subRes.data ?? []) {
      productBySub.set(row.paddle_subscription_id, row.product_id);
    }

    return (txnRes.data ?? []).map((row) => {
      const productId = row.subscription_id ? productBySub.get(row.subscription_id) : undefined;
      const plan = productId ? planByProductId(productId) : undefined;
      return {
        transactionId: row.paddle_transaction_id,
        createdAt: row.created_at,
        status: row.status,
        currency: (row.currency ?? "EUR").toUpperCase(),
        total: Number(row.total ?? 0),
        tax: Number(row.tax ?? 0),
        description: plan ? `Tedbirge® WebOS ${plan.label} aboneliği` : "Tedbirge® WebOS aboneliği",
        email,
      };
    });
  });
