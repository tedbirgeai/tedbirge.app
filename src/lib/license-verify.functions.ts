import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lisans anahtarını oturum sahibinin etkin lisanslarıyla karşılaştırır (RLS altında). */
export const verifyLicenseKeyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ licenseKey: z.string().min(8).max(128) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("licenses")
      .select("plan, node_limit, status, current_period_end, user_id")
      .eq("license_key", data.licenseKey)
      .eq("user_id", context.userId)
      .maybeSingle();

    const expired = row?.current_period_end && Date.parse(row.current_period_end) < Date.now();
    if (!row || row.status !== "active" || expired) {
      return { valid: false as const, plan: "", nodeLimit: 5, currentPeriodEnd: null };
    }
    return {
      valid: true as const,
      plan: row.plan,
      nodeLimit: row.node_limit,
      currentPeriodEnd: row.current_period_end,
    };
  });
