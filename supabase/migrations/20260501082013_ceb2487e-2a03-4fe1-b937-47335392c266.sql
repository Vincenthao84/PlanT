ALTER TABLE public.requests
  ADD COLUMN taker_paypal_email TEXT,
  ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN paypal_order_id TEXT,
  ADD COLUMN paypal_payout_batch_id TEXT,
  ADD COLUMN amount_cents INTEGER,
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN platform_fee_cents INTEGER,
  ADD COLUMN paid_at TIMESTAMPTZ,
  ADD COLUMN released_at TIMESTAMPTZ;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_payment_status_check
  CHECK (payment_status IN ('unpaid', 'paid_held', 'released', 'failed'));

CREATE INDEX idx_requests_paypal_order_id ON public.requests(paypal_order_id);
CREATE INDEX idx_requests_payout_batch_id ON public.requests(paypal_payout_batch_id);