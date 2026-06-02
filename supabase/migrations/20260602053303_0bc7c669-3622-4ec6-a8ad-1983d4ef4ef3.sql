
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_paid_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.requests_posted_this_month(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orders_taken_this_month(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_request_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_request_bids(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_request_bids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_request_bid(uuid) TO authenticated;
