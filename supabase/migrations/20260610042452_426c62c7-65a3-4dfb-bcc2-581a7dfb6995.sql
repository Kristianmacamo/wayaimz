
-- Add missing payment columns
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS transaction_code TEXT,
  ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Storage policies for mpesa-proofs bucket (private)
CREATE POLICY "users upload own proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'mpesa-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "users read own proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'mpesa-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR has_role(auth.uid(), 'admin'::app_role)));
