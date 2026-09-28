CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  message text NOT NULL,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Kimse (anon/authenticated) okuyamaz; yalnız service_role erişir.
CREATE POLICY "contact_messages_insert_any"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (length(email) BETWEEN 3 AND 320 AND length(message) BETWEEN 1 AND 5000);
