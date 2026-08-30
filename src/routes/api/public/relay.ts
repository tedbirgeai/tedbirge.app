/**
 * Bulut yedek röle (store-and-forward).
 * ------------------------------------------------------------------
 * Alıcı cihaz kapalıyken mesaj kaybolmasın diye ŞİFRELİ zarf geçici
 * olarak saklanır ve alıcı çevrimiçi olunca teslim edilir.
 *
 * Gizlilik: gövde X25519 + AES-256-GCM ile uçtan uca şifrelidir; sunucu
 * yalnızca yönlendirme başlığını (kimden/kime) görür, içeriği açamaz.
 * Zarf 14 gün sonra otomatik olarak düşer.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const MAX_ENVELOPE = 256 * 1024;
const MAX_PULL = 100;

const NodeId = z.string().trim().min(3).max(120);

const Body = z.union([
  z.object({
    action: z.literal("publish"),
    nodeId: NodeId,
    personId: z.string().trim().min(3).max(120).optional(),
    signPublic: z.string().min(10).max(500),
    boxPublic: z.string().min(10).max(500),
  }),
  z.object({ action: z.literal("lookup"), nodeId: NodeId }),
  z.object({
    action: z.literal("push"),
    items: z
      .array(
        z.object({
          pktId: z.string().min(4).max(200),
          to: NodeId,
          from: NodeId,
          envelope: z.string().min(10).max(MAX_ENVELOPE),
          priority: z.number().int().min(0).max(3).default(2),
        }),
      )
      .min(1)
      .max(50),
  }),
  z.object({
    action: z.literal("pull"),
    nodeId: NodeId,
    personId: z.string().trim().min(3).max(120).optional(),
    ack: z.array(z.string().max(200)).max(MAX_PULL).default([]),
  }),
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/**
 * Depo geçici olarak kapalıyken HTTP hatası döndürmeyiz: istemci zaten
 * yerel kuyrukta bekletiyor. Hata kodu, tarayıcı/istemci hata katmanlarını
 * gereksizce tetikliyordu; bunun yerine 200 + `degraded` sözleşmesi.
 */
function storageUnavailable(operation: string, error: unknown) {
  console.error(`[relay] ${operation} başarısız`, error);
  return new Response(
    JSON.stringify({ ok: false, error: "depo_kapali", degraded: true, retryAfter: 30 }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "retry-after": "30",
      },
    },
  );
}

function deadline<T>(promise: PromiseLike<T>, milliseconds: number): Promise<T | null> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), milliseconds)),
  ]);
}

function clientKey(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "anonim"
  );
}

export const Route = createFileRoute("/api/public/relay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed: z.infer<typeof Body>;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return json({ ok: false, error: "gecersiz_istek" }, 400);
        }

        // Kota cihaz (düğüm) başına uygulanır: aynı ev/ofis ağındaki tüm
        // cihazlar tek IP kotasını paylaşıp birbirini kilitlemez. IP başına
        // yalnız kötüye kullanımı durduran yüksek bir tavan kalır.
        const actor =
          parsed.action === "push" ? (parsed.items[0]?.from ?? "anonim") : parsed.nodeId;
        const readOnly = parsed.action === "lookup" || parsed.action === "pull";

        const { checkApiRateLimit } = await import("@/lib/api-rate-limit.server");
        const perNode = await deadline(
          checkApiRateLimit("relay:node", actor, {
            perMinute: readOnly ? 300 : 180,
            perDay: 200_000,
          }),
          750,
        );
        const perIp = perNode?.ok
          ? await deadline(
              checkApiRateLimit("relay:ip", clientKey(request), {
                perMinute: 3_000,
                perDay: 1_000_000,
              }),
              750,
            )
          : perNode;
        const limit = perNode?.ok ? perIp : perNode;
        if (limit && !limit.ok) {
          return new Response(JSON.stringify({ ok: false, error: limit.message }), {
            status: 429,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
              "retry-after": String(limit.retryAfterSeconds),
            },
          });
        }

        // Bulut deposu geçici olarak ulaşılamaz olabilir (duraklatılmış/bakımda).
        // Bu durumda 500 yerine "hizmet geçici olarak kapalı" cevabı döneriz;
        // istemci yerel kuyrukta bekletip yeniden dener, arayüz boş ekrana düşmez.
        let supabaseAdmin: Awaited<
          typeof import("@/integrations/supabase/client.server")
        >["supabaseAdmin"];
        try {
          ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
        } catch {
          return json({ ok: false, error: "depo_kapali", degraded: true, retryAfter: 30 });
        }

        try {
        const storeSignal = AbortSignal.timeout(3_000);
        if (parsed.action === "publish") {
          const { error } = await supabaseAdmin.from("relay_directory").upsert(
            {
              node_id: parsed.nodeId,
              person_id: parsed.personId ?? null,
              sign_public: parsed.signPublic,
              box_public: parsed.boxPublic,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "node_id" },
          ).abortSignal(storeSignal);
          if (error) return storageUnavailable("dizin kaydı", error);
          return json({ ok: true });
        }

        if (parsed.action === "lookup") {
          // Kimlik hem cihaz düğümü (mob-…) hem kişi kimliği (TBG-…) olabilir.
          // Kişinin TÜM bağlı cihazları döndürülür; gönderen her cihaz için
          // ayrı şifreli zarf üretir (WhatsApp çoklu cihaz modeli).
          const { data: self, error: selfError } = await supabaseAdmin
            .from("relay_directory")
            .select("node_id, person_id, sign_public, box_public")
            .eq("node_id", parsed.nodeId)
            .abortSignal(storeSignal)
            .maybeSingle();
          if (selfError) return storageUnavailable("düğüm araması", selfError);

          const person = self?.person_id ?? parsed.nodeId;
          const { data: fanout, error: fanoutError } = await supabaseAdmin
            .from("relay_directory")
            .select("node_id, person_id, sign_public, box_public")
            .eq("person_id", person)
            .limit(20)
            .abortSignal(storeSignal);
          if (fanoutError) return storageUnavailable("bağlı cihaz araması", fanoutError);

          const map = new Map<
            string,
            { node_id: string; sign_public: string; box_public: string }
          >();
          for (const row of [...(fanout ?? []), ...(self ? [self] : [])]) {
            map.set(row.node_id, {
              node_id: row.node_id,
              sign_public: row.sign_public,
              box_public: row.box_public,
            });
          }
          const devices = Array.from(map.values());
          if (devices.length === 0) return json({ ok: true, found: false, devices: [] });
          const primary = self ?? devices[0];
          if (!primary) return json({ ok: true, found: false, devices: [] });
          return json({
            ok: true,
            found: true,
            nodeId: primary.node_id,
            signPublic: primary.sign_public,
            boxPublic: primary.box_public,
            devices: devices.map((d) => ({
              nodeId: d.node_id,
              signPublic: d.sign_public,
              boxPublic: d.box_public,
            })),
          });
        }

        if (parsed.action === "push") {
          const rows = parsed.items.map((i) => ({
            pkt_id: i.pktId,
            target_node: i.to,
            origin_node: i.from,
            envelope: i.envelope,
            priority: i.priority,
          }));
          const { error } = await supabaseAdmin
            .from("relay_envelopes")
            .upsert(rows, { onConflict: "pkt_id", ignoreDuplicates: true })
            .abortSignal(storeSignal);
          if (error) return storageUnavailable("zarf kuyruğu", error);
          // Alıcı kapalıysa cihazını uyandır: yalnızca "yeni şifreli mesaj var"
          // sinyali gider; içerik sunucudan geçmez.
          try {
            const { notifyNode } = await import("@/lib/push-dispatch.server");
            const targets = Array.from(new Set(parsed.items.map((i) => i.to))).slice(0, 20);
            await Promise.all(
              targets.map((to) =>
                notifyNode(to, {
                  kind: "message",
                  title: "Yeni mesaj",
                  body: "Şifreli yeni mesajınız var.",
                  tag: "tedbirge-chat",
                  url: "/chat",
                }),
              ),
            );
          } catch {
            /* bildirim gönderilemese de mesaj kuyrukta durur */
          }
          return json({ ok: true, stored: rows.length });
        }

        // pull
        const mailboxes = Array.from(
          new Set([parsed.nodeId, ...(parsed.personId ? [parsed.personId] : [])]),
        );
        if (parsed.ack.length) {
          const { error: ackError } = await supabaseAdmin
            .from("relay_envelopes")
            .delete()
            .in("target_node", mailboxes)
            .in("pkt_id", parsed.ack)
            .abortSignal(storeSignal);
          if (ackError) return storageUnavailable("teslim onayı", ackError);
        }
        // Süresi dolan zarfların silinmesi artık istek yolunda değil,
        // zamanlanmış `relay_prune_expired` işindedir. Teslimatın büyük
        // bir silme sorgusuna takılmaması için burada yalnızca süresi
        // geçmemiş zarflar okunur.
        const { data, error: pullError } = await supabaseAdmin
          .from("relay_envelopes")
          .select("pkt_id, envelope")
          .in("target_node", mailboxes)
          .gt("expires_at", new Date().toISOString())
          .order("priority", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(MAX_PULL)
          .abortSignal(storeSignal);
        if (pullError) return storageUnavailable("zarf teslimi", pullError);

        return json({
          ok: true,
          items: (data ?? []).map((r) => ({ pktId: r.pkt_id, envelope: r.envelope })),
        });
        } catch (error) {
          console.error("[relay] depo erişilemedi", error);
          return json({ ok: false, error: "depo_kapali", degraded: true, retryAfter: 30 });
        }
      },
    },
  },
});
