
-- Admin moderation policies

-- requests: admin can view/update/delete all
CREATE POLICY "Admins can view all requests"
  ON public.requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any request"
  ON public.requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any request"
  ON public.requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- request_messages: admin can view/delete all
CREATE POLICY "Admins can view all messages"
  ON public.request_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any message"
  ON public.request_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- request_bids: admin can delete any
CREATE POLICY "Admins can delete any bid"
  ON public.request_bids FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Bypass owner/taker update guard for admins
CREATE OR REPLACE FUNCTION public.requests_update_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Admins bypass the guard
  IF uid IS NOT NULL AND public.has_role(uid, 'admin') THEN
    RETURN NEW;
  END IF;

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
    IF NEW.taken_by IS NOT NULL AND NEW.taken_by IS DISTINCT FROM OLD.taken_by THEN
      RAISE EXCEPTION 'Helpers cannot reassign the request to someone else';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
