import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  verifyWebhook,
  WebhookSignatureError,
  EventName,
  type PaddleEnv,
} from "@/lib/paddle.server";
import { planByProductId, planByPriceId, resolveNodeLimit } from "@/lib/paddle-catalog";

import type { Database } from "@/integrations/supabase/types";

type ServiceClient = SupabaseClient<Database>;

let _supabase: ServiceClient | null = null;
function getSupabase(): ServiceClient {
  if (!_supabase) {
    _supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

/**
 * Ödeme sağlayıcısının olay gövdesinden yalnız kullandığımız alanlar.
 * Gövde imza doğrulamasından geçmiş olsa da tipler dar tutulur: beklenmeyen
 * alanlar okunmaz, böylece sağlayıcı şeması değişse de kayıt bozulmaz.
 */
type PaddleImportMeta = { importMeta?: { externalId?: string | null } | null };

type PaddleSubscriptionItem = {
  quantity?: number;
  price?: (PaddleImportMeta & { id?: string }) | null;
  product?: (PaddleImportMeta & { id?: string }) | null;
};

type PaddleBillingPeriod = { startsAt?: string | null; endsAt?: string | null } | null;

type PaddleCustomData = Record<string, unknown> | null | undefined;

type PaddleSubscriptionData = {
  id: string;
  customerId?: string;
  status?: string;
  items?: PaddleSubscriptionItem[];
  currentBillingPeriod?: PaddleBillingPeriod;
  scheduledChange?: { action?: string } | null;
  customData?: PaddleCustomData;
};

type PaddleTransactionData = {
  id?: string;
  status?: string;
  currencyCode?: string;
  subscriptionId?: string | null;
  details?: { totals?: { total?: string | null; tax?: string | null } | null } | null;
  customData?: PaddleCustomData;
};

/** Serbest biçimli `customData` alanından yalnız metin değerleri okunur. */
function customText(data: PaddleCustomData, key: string): string | null {
  const value = data?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

async function handleSubscriptionCreated(data: PaddleSubscriptionData, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;

  const userId = customText(customData, "userId");
  if (!userId) {
    console.error("No userId in customData");
    return;
  }

  const item = items?.[0];
  if (!item) {
    console.warn("Skipping subscription: no items in payload");
    return;
  }
  const priceId = item.price?.importMeta?.externalId;
  const productId = item.product?.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn("Skipping subscription: missing importMeta.externalId", {
      rawPriceId: item.price?.id,
      rawProductId: item.product?.id,
    });
    return;
  }

  const plan = planByProductId(productId) ?? planByPriceId(priceId);
  if (!plan) {
    console.warn("Unknown product/price mapping, skipping", { productId, priceId });
    return;
  }

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        paddle_subscription_id: id,
        paddle_customer_id: customerId ?? "",
        product_id: productId,
        price_id: priceId,
        status: status ?? "active",
        current_period_start: currentBillingPeriod?.startsAt,
        current_period_end: currentBillingPeriod?.endsAt,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paddle_subscription_id" },
    );

  const { data: existing } = await getSupabase()
    .from("licenses")
    .select("id")
    .eq("provider_subscription_id", id)
    .maybeSingle();

  const licenseRow = {
    user_id: userId,
    email: customText(customData, "email") ?? "",
    plan: productId,
    status: "active",
    node_limit: resolveNodeLimit(plan, item.quantity),
    provider: "paddle",
    provider_subscription_id: id,
    current_period_end: currentBillingPeriod?.endsAt,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    await getSupabase().from("licenses").update(licenseRow).eq("id", existing.id);
  } else {
    await getSupabase().from("licenses").insert(licenseRow);
  }
}

async function handleSubscriptionUpdated(data: PaddleSubscriptionData, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;

  await getSupabase()
    .from("subscriptions")
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === "cancel",
      updated_at: new Date().toISOString(),
    })
    .eq("paddle_subscription_id", id)
    .eq("environment", env);

  // Plan/adet değişiminde lisans kotasını da senkronla (Community 5 → Pro 6-24 → Enterprise 25+).
  const item = items?.[0];
  const productId = item?.product?.importMeta?.externalId;
  const priceId = item?.price?.importMeta?.externalId;
  const plan =
    (productId ? planByProductId(productId) : undefined) ??
    (priceId ? planByPriceId(priceId) : undefined);

  if (plan) {
    await getSupabase()
      .from("licenses")
      .update({
        plan: plan.productId,
        node_limit: resolveNodeLimit(plan, item?.quantity),
        status: ["active", "trialing", "past_due"].includes(status) ? "active" : status,
        current_period_end: currentBillingPeriod?.endsAt,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", id);
  }
}

async function handleSubscriptionCanceled(data: PaddleSubscriptionData, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);

  await getSupabase()
    .from("licenses")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("provider_subscription_id", data.id);
}

/** Tamamlanan işlem: idempotent kayıt + lisans olayı (aynı txn ikinci kez işlenmez). */
async function handleTransactionCompleted(data: PaddleTransactionData, env: PaddleEnv) {
  const txnId = data?.id;
  if (!txnId) return;
  const userId = customText(data.customData, "userId");
  const { error } = await getSupabase()
    .from("payment_transactions")
    .insert({
      paddle_transaction_id: txnId,
      user_id: userId,
      subscription_id: data.subscriptionId ?? null,
      status: data.status ?? "completed",
      currency: data.currencyCode ?? null,
      total: data.details?.totals?.total ?? null,
      tax: data.details?.totals?.tax ?? null,
      environment: env,
    });
  if (error) {
    if (error.code === "23505") return; // zaten işlendi
    throw error;
  }
  if (!data.subscriptionId) return;
  const { data: lic } = await getSupabase()
    .from("licenses")
    .select("id")
    .eq("provider_subscription_id", data.subscriptionId)
    .maybeSingle();
  if (lic) {
    await getSupabase()
      .from("license_events")
      .insert({
        license_id: lic.id,
        user_id: userId,
        event: "payment_completed",
        detail: `İşlem ${txnId} tamamlandı.`,
        actor: "paddle",
      });
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      console.warn("İşlenmeyen ödeme olayı:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          if (e instanceof WebhookSignatureError) {
            return new Response("Invalid signature", { status: 401 });
          }
          // İşleme hatası: Paddle yeniden denesin diye 500 döneriz.
          return new Response("Webhook processing error", { status: 500 });
        }
      },
    },
  },
});
