-- Fix mutable search_path on set_updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Lock down SECURITY DEFINER functions so they can only be called by triggers / server-side, not via PostgREST
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
-- has_role is still callable by authenticated users (needed by RLS policies); RLS policies bypass EXECUTE checks anyway.
grant execute on function public.has_role(uuid, public.app_role) to authenticated;