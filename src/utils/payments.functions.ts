import { createServerFn } from "@tanstack/react-start";
import { gatewayFetch, getPaddleClient, type PaddleEnv } from "@/lib/paddle.server";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => data)
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      data.environment,
      `/prices?status=active&external_id=${encodeURIComponent(data.priceId)}`,
    );
    const result = (await response.json()) as {
      data?: Array<{ id: string; status?: string }>;
    };
    const active = (result.data ?? []).filter((p) => (p.status ?? "active") === "active");
    if (active.length === 0) throw new Error(`Fiyat bulunamadı: ${data.priceId}`);
    // Aynı kimlikte birden fazla etkin fiyat varsa hangisinin tahsil edileceği
    // belirsizdir; sessizce ilkini seçmek yerine akış durdurulur.
    if (active.length > 1) {
      throw new Error(
        `Fiyat kataloğu tutarsız: "${data.priceId}" için ${active.length} etkin kayıt var.`,
      );
    }
    return active[0].id;
  });


export const createPortalSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { customerId: string; subscriptionId: string; environment: PaddleEnv }) => data,
  )
  .handler(async ({ data }) => {
    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(data.customerId, [
      data.subscriptionId,
    ]);
    return { url: session.urls.general.overview };
  });
