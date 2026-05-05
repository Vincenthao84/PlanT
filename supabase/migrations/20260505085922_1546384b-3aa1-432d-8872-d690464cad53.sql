ALTER TABLE public.requests
  ADD COLUMN IF NOT EXISTS taker_payment_qr_url text,
  ADD COLUMN IF NOT EXISTS taker_payment_note text NOT NULL DEFAULT '';