import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ContactSchema = z.object({
  email: z.string().email().max(320),
  message: z.string().min(1).max(5000),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ContactSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const req = (context as unknown as { request?: Request } | undefined)?.request;
    const userAgent = req?.headers.get("user-agent") ?? null;
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      email: data.email,
      message: data.message,
      user_agent: userAgent,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
