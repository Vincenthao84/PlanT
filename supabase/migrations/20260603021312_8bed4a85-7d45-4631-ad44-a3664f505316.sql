CREATE OR REPLACE FUNCTION public.enforce_order_take_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if new.taken_by is not null
     and (old.taken_by is null or old.taken_by is distinct from new.taken_by)
  then
    if public.is_paid_user(new.taken_by) then
      return new;
    end if;

    if public.orders_taken_this_month(new.taken_by) >= 15 then
      raise exception 'Free tier limit reached: you can take up to 15 orders per month. Upgrade to continue.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$;