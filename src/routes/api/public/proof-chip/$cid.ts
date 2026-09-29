import { createFileRoute } from "@tanstack/react-router";

/**
 * Gömülebilir Proof Chip (SVG). Yalnız sunucuda kayıtlı kanıt kaydını gösterir;
 * kayıt yoksa "doğrulanmadı" rozeti döner. Girdi metni asla saklanmaz/gösterilmez.
 */

const CID_RE = /^cid:axiom:[0-9a-f]{8,32}$/;

function esc(s: string) {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function svg(label: string, value: string, tone: "ok" | "warn" | "bad") {
  const color = tone === "ok" ? "#1f8a4c" : tone === "warn" ? "#a06a00" : "#8a1f2c";
  const lw = 7 * label.length + 16;
  const vw = 7 * value.length + 16;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${lw + vw}" height="22" role="img" aria-label="${esc(label)}: ${esc(value)}"><rect width="${lw}" height="22" fill="#2b2f36"/><rect x="${lw}" width="${vw}" height="22" fill="${color}"/><g fill="#fff" font-family="Verdana,sans-serif" font-size="11"><text x="8" y="15">${esc(label)}</text><text x="${lw + 8}" y="15">${esc(value)}</text></g></svg>`;
}

export const Route = createFileRoute("/api/public/proof-chip/$cid")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const cid = decodeURIComponent(params.cid).replace(/\.svg$/, "");
        const headers = {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          "X-Content-Type-Options": "nosniff",
        };
        if (!CID_RE.test(cid)) {
          return new Response(svg("AXIOM", "geçersiz kimlik", "bad"), { status: 400, headers });
        }
        // Kayıtlar artık herkese açık değil; rozet yalnız sunucuda, CID filtresiyle okunur.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data } = await supabaseAdmin
          .from("proof_records")
          .select("verdict, simulated")
          .eq("cid", cid)
          .maybeSingle();
        if (!data) return new Response(svg("AXIOM", "kayıt yok", "warn"), { status: 404, headers });
        if (data.simulated)
          return new Response(svg("AXIOM", `${data.verdict} · simülasyon`, "warn"), { headers });
        const tone = data.verdict === "proved" ? "ok" : data.verdict === "refuted" ? "bad" : "warn";
        return new Response(svg("AXIOM", `${data.verdict} · doğrulandı`, tone), { headers });
      },
    },
  },
});
