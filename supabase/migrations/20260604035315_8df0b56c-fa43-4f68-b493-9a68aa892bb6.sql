
-- Fix 1: Stop exposing payment data + secret requests via base table RLS.
-- Switch requests_public to security definer (security_invoker=off) so it
-- can serve the browse case while bypassing base-table RLS, then drop the
-- overly broad SELECT policy on requests.
ALTER VIEW public.requests_public SET (security_invoker = off);
GRANT SELECT ON public.requests_public TO authenticated;

DROP POLICY IF EXISTS "Authenticated users can view open requests" ON public.requests;

-- Fix 2: Remove the requestor's direct UPDATE access on request_bids.
-- Bid acceptance must go through accept_request_bid() (SECURITY DEFINER),
-- so requestors do not need direct write access to bid rows.
DROP POLICY IF EXISTS "Requestor can update bids on their request" ON public.request_bids;
