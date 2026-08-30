-- 1) Çevrimdışı kontrol işi: pg_net işlevleri `net` şemasında yaşar,
--    `extensions.http_post` çözülmüyordu. İş doğru işlevle yeniden kurulur.
SELECT cron.unschedule('tedbirge-offline-check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tedbirge-offline-check'
);

SELECT cron.schedule(
  'tedbirge-offline-check',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--04a05552-b64f-40b7-b600-3a1a8e98926b.lovable.app/api/public/cron/offline-check',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_EIRZKj5miJlp5fokAEf9Tg_FdqFqDrA"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 2) Süresi dolan zarf temizliği artık her istekte değil, zamanlanmış
--    işte ve gruplar hâlinde yapılır: ifade zaman aşımı oluşmaz.
CREATE INDEX IF NOT EXISTS relay_envelopes_expires_idx
  ON public.relay_envelopes (expires_at);

CREATE OR REPLACE FUNCTION public.relay_prune_expired(batch_size integer DEFAULT 2000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer := 0;
  chunk integer := 0;
  rounds integer := 0;
BEGIN
  LOOP
    DELETE FROM public.relay_envelopes
    WHERE ctid IN (
      SELECT ctid FROM public.relay_envelopes
      WHERE expires_at < now()
      LIMIT batch_size
    );
    GET DIAGNOSTICS chunk = ROW_COUNT;
    removed := removed + chunk;
    rounds := rounds + 1;
    EXIT WHEN chunk = 0 OR rounds >= 25;
  END LOOP;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.relay_prune_expired(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.relay_prune_expired(integer) TO service_role;

SELECT cron.unschedule('tedbirge-relay-prune') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'tedbirge-relay-prune'
);

SELECT cron.schedule(
  'tedbirge-relay-prune',
  '*/10 * * * *',
  $$ SELECT public.relay_prune_expired(2000); $$
);