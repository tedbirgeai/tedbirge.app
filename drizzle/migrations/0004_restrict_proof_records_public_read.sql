DROP POLICY IF EXISTS "Proof records are public" ON public.proof_records;
REVOKE SELECT ON public.proof_records FROM anon;
REVOKE SELECT ON public.proof_records FROM authenticated;