-- Lock down column-level UPDATE privileges on public.requests so that
-- authenticated users cannot directly modify payment/payout/status columns,
-- even though row-level policies permit updating their own / taken rows.
-- Sensitive transitions must go through SECURITY DEFINER RPCs or service_role.

REVOKE UPDATE ON public.requests FROM authenticated;

GRANT UPDATE (
  title,
  description,
  location_label,
  lat,
  lng,
  reward,
  is_secret,
  completed_at,
  taken_by,
  taken_at,
  taker_completed_at,
  taker_payment_qr_url,
  taker_payment_note,
  fee_settled_at,
  updated_at
) ON public.requests TO authenticated;

-- service_role retains full privileges (granted previously via GRANT ALL).
GRANT ALL ON public.requests TO service_role;
