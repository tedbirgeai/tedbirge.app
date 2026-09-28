CREATE TABLE public.proof_records (
  cid text PRIMARY KEY,
  verdict text NOT NULL,
  engine text NOT NULL,
  simulated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.proof_records TO anon, authenticated;
GRANT ALL ON public.proof_records TO service_role;
ALTER TABLE public.proof_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proof records are public" ON public.proof_records FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.payment_transactions (
  paddle_transaction_id text PRIMARY KEY,
  user_id uuid,
  subscription_id text,
  status text NOT NULL,
  currency text,
  total text,
  tax text,
  environment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);