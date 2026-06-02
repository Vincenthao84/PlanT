
-- 1) Public-safe view used for browsing requests (no payment data, secret rows hidden from non-participants)
CREATE OR REPLACE VIEW public.requests_public
WITH (security_invoker = on) AS
SELECT
  id, user_id, type, title, description, location_label, lat, lng, reward,
  created_at, updated_at, completed_at, taken_by, taken_at,
  taker_completed_at, fee_settled_at, is_secret, currency
FROM public.requests
WHERE is_secret = false OR user_id = auth.uid() OR taken_by = auth.uid();

GRANT SELECT ON public.requests_public TO authenticated;

-- 2) Restrict base table SELECT to participants only (owner or taker)
DROP POLICY IF EXISTS "Requests are viewable by authenticated users" ON public.requests;
CREATE POLICY "Participants can view full request"
ON public.requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR taken_by = auth.uid());

-- 3) Column-level UPDATE guard to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.requests_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Owner (who is not also the taker) edits: cannot touch taker_by or payment fields directly
  IF uid IS NOT NULL AND uid = OLD.user_id AND (OLD.taken_by IS NULL OR uid <> OLD.taken_by) THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'Cannot change user_id';
    END IF;
    IF NEW.taken_by IS DISTINCT FROM OLD.taken_by
       OR NEW.taken_at IS DISTINCT FROM OLD.taken_at THEN
      RAISE EXCEPTION 'Owners cannot directly assign a helper; use the bid acceptance flow';
    END IF;
    IF NEW.taker_completed_at IS DISTINCT FROM OLD.taker_completed_at
       OR NEW.taker_paypal_email IS DISTINCT FROM OLD.taker_paypal_email
       OR NEW.taker_payment_qr_url IS DISTINCT FROM OLD.taker_payment_qr_url
       OR NEW.taker_payment_note IS DISTINCT FROM OLD.taker_payment_note
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.paypal_order_id IS DISTINCT FROM OLD.paypal_order_id
       OR NEW.paypal_payout_batch_id IS DISTINCT FROM OLD.paypal_payout_batch_id
       OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.released_at IS DISTINCT FROM OLD.released_at THEN
      RAISE EXCEPTION 'Owners cannot modify taker or payment fields directly';
    END IF;
  END IF;

  -- Taker (who is not the owner) edits: may only touch their own delivery + payment-instruction fields
  IF uid IS NOT NULL AND uid = OLD.taken_by AND uid <> OLD.user_id THEN
    IF NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.location_label IS DISTINCT FROM OLD.location_label
       OR NEW.lat IS DISTINCT FROM OLD.lat
       OR NEW.lng IS DISTINCT FROM OLD.lng
       OR NEW.reward IS DISTINCT FROM OLD.reward
       OR NEW.is_secret IS DISTINCT FROM OLD.is_secret
       OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
       OR NEW.fee_settled_at IS DISTINCT FROM OLD.fee_settled_at
       OR NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.paypal_order_id IS DISTINCT FROM OLD.paypal_order_id
       OR NEW.paypal_payout_batch_id IS DISTINCT FROM OLD.paypal_payout_batch_id
       OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
       OR NEW.platform_fee_cents IS DISTINCT FROM OLD.platform_fee_cents
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
       OR NEW.released_at IS DISTINCT FROM OLD.released_at THEN
      RAISE EXCEPTION 'Helpers can only update their own delivery and payment-instruction fields';
    END IF;
    -- Helpers also cannot reassign taken_by to a different person, only release it (set to NULL) or keep
    IF NEW.taken_by IS NOT NULL AND NEW.taken_by IS DISTINCT FROM OLD.taken_by THEN
      RAISE EXCEPTION 'Helpers cannot reassign the request to someone else';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS requests_update_guard_trigger ON public.requests;
CREATE TRIGGER requests_update_guard_trigger
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.requests_update_guard();

-- 4) Storage: explicit UPDATE policy on task-photos scoped to owner folder
DROP POLICY IF EXISTS "Users can update own task photos" ON storage.objects;
CREATE POLICY "Users can update own task photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'task-photos' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'task-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5) Revoke EXECUTE on SECURITY DEFINER helpers from anon (signed-out users)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_paid_user(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.requests_posted_this_month(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.orders_taken_this_month(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_request_participant(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_view_request_bids(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_request_bids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_request_bid(uuid) FROM anon;
