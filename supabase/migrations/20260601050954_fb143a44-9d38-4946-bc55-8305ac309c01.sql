
-- Status enum for bids
do $$ begin
  create type public.bid_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

CREATE TABLE public.request_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  helper_id uuid NOT NULL,
  amount text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  status public.bid_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, helper_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_bids TO authenticated;
GRANT ALL ON public.request_bids TO service_role;

ALTER TABLE public.request_bids ENABLE ROW LEVEL SECURITY;

-- Helper function: is the viewer the requestor or a bidder on this request?
CREATE OR REPLACE FUNCTION public.can_view_request_bids(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1 from public.requests r
    where r.id = _request_id and r.user_id = _user_id
  ) or exists (
    select 1 from public.request_bids b
    where b.request_id = _request_id and b.helper_id = _user_id
  )
$$;

CREATE POLICY "View bids if requestor or bidder"
  ON public.request_bids FOR SELECT TO authenticated
  USING (public.can_view_request_bids(request_id, auth.uid()));

CREATE POLICY "Helpers can place a bid on open requests not their own"
  ON public.request_bids FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = helper_id
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND r.user_id <> auth.uid()
        AND r.taken_by IS NULL
    )
  );

CREATE POLICY "Helpers can update their own pending bid"
  ON public.request_bids FOR UPDATE TO authenticated
  USING (auth.uid() = helper_id AND status = 'pending')
  WITH CHECK (auth.uid() = helper_id);

CREATE POLICY "Requestor can update bids on their request"
  ON public.request_bids FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.user_id = auth.uid()));

CREATE POLICY "Helpers can delete their own pending bid"
  ON public.request_bids FOR DELETE TO authenticated
  USING (auth.uid() = helper_id AND status = 'pending');

-- Updated_at trigger
CREATE TRIGGER request_bids_set_updated_at
  BEFORE UPDATE ON public.request_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Accept a bid: assigns request taker and rejects other pending bids
CREATE OR REPLACE FUNCTION public.accept_request_bid(_bid_id uuid)
RETURNS public.request_bids
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bid public.request_bids;
  v_request public.requests;
BEGIN
  SELECT * INTO v_bid FROM public.request_bids WHERE id = _bid_id;
  IF v_bid IS NULL THEN
    RAISE EXCEPTION 'Bid not found';
  END IF;

  SELECT * INTO v_request FROM public.requests WHERE id = v_bid.request_id;
  IF v_request.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the requestor can accept a bid';
  END IF;
  IF v_request.taken_by IS NOT NULL THEN
    RAISE EXCEPTION 'This request has already been assigned';
  END IF;

  UPDATE public.requests
    SET taken_by = v_bid.helper_id,
        taken_at = now()
    WHERE id = v_request.id;

  UPDATE public.request_bids
    SET status = 'rejected', updated_at = now()
    WHERE request_id = v_request.id AND id <> v_bid.id AND status = 'pending';

  UPDATE public.request_bids
    SET status = 'accepted', updated_at = now()
    WHERE id = v_bid.id
    RETURNING * INTO v_bid;

  RETURN v_bid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_request_bid(uuid) TO authenticated;

-- Fetch bids with helper display name in one call
CREATE OR REPLACE FUNCTION public.list_request_bids(_request_id uuid)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  helper_id uuid,
  amount text,
  note text,
  status public.bid_status,
  created_at timestamptz,
  helper_display_name text,
  helper_avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.request_id, b.helper_id, b.amount, b.note, b.status, b.created_at,
         p.display_name, p.avatar_url
  FROM public.request_bids b
  LEFT JOIN public.profiles p ON p.id = b.helper_id
  WHERE b.request_id = _request_id
    AND public.can_view_request_bids(_request_id, auth.uid())
  ORDER BY b.created_at ASC
$$;

GRANT EXECUTE ON FUNCTION public.list_request_bids(uuid) TO authenticated;
