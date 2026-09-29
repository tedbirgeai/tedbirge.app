import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { checkChatRateLimit } from "@/lib/chat-rate-limit.server";

const MAX_MESSAGES = 60;
const MAX_CHARS = 6000;
const RUN_ID = "X-Lovable-AIG-Run-ID";

const SYSTEM = `Sen Tedbirge® WebOS içindeki Axiom Bot'sun. Türkçe, kısa ve net yanıt ver.
Kullanıcıya WebOS uygulamaları (Dosyalar, Tablolar, Yazar, AxiomStudio, Sohbet), çevrimdışı
mesh ağı ve AXIOM doğrulama motoru hakkında yardım edersin. Bir iddianın kesin doğruluğunu
kendin onaylama; matematiksel/fiziksel iddialar için kullanıcıya AXIOM motorunun sonucunu
beklemesini söyle. Tedbirge'yi asla ücretsiz internet, VPN ya da proxy olarak tanıtma.`;

function textOf(m: unknown): string {
  const parts = (m as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => ((p as { type?: string }).type === "text" ? String((p as { text?: unknown }).text ?? "") : ""))
    .join("");
}

export const Route = createFileRoute("/api/axiom-bot")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { messages?: unknown };
        try {
          body = (await request.json()) as { messages?: unknown };
        } catch {
          return new Response("Geçersiz istek", { status: 400 });
        }
        const messages = body.messages;
        if (!Array.isArray(messages) || !messages.length)
          return new Response("Mesaj gerekli", { status: 400 });
        if (messages.length > MAX_MESSAGES) return new Response("Sohbet çok uzun", { status: 413 });
        const bad = messages.some(
          (m) =>
            !m ||
            typeof m !== "object" ||
            !["user", "assistant"].includes(String((m as { role?: unknown }).role)) ||
            !Array.isArray((m as { parts?: unknown }).parts),
        );
        if (bad) return new Response("Mesaj biçimi geçersiz", { status: 400 });
        if (textOf(messages[messages.length - 1]).length > MAX_CHARS)
          return new Response("Mesaj çok uzun", { status: 413 });

        const limit = await checkChatRateLimit(request);
        if (!limit.ok)
          return new Response(limit.message, {
            status: 429,
            headers: { "retry-after": String(limit.retryAfterSeconds) },
          });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("AI yapılandırması eksik", { status: 500 });

        let runId = request.headers.get(RUN_ID)?.trim() || undefined;
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: async (input, init) => {
            const h = new Headers(init?.headers);
            if (runId && !h.has(RUN_ID)) h.set(RUN_ID, runId);
            const res = await fetch(input, { ...init, headers: h });
            runId ??= res.headers.get(RUN_ID)?.trim() || undefined;
            return res;
          },
        });

        const result = streamText({
          model: provider.responses("openai/gpt-6-astra"),
          system: SYSTEM,
          messages: await convertToModelMessages(messages as UIMessage[]),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: (error) => {
            const msg = error instanceof Error ? error.message : "";
            if (/402|credit/i.test(msg)) return "AI kredisi yetersiz. Çalışma alanı ayarlarından kredi ekleyin.";
            if (/429|rate/i.test(msg)) return "Çok fazla istek. Biraz sonra tekrar deneyin.";
            console.error("[axiom-bot] stream error");
            return "Axiom Bot şu anda yanıt veremiyor.";
          },
        });
      },
    },
  },
});
