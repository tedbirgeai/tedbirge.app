CREATE INDEX IF NOT EXISTS relay_envelopes_pull_idx
  ON public.relay_envelopes (target_node, expires_at, priority, created_at);