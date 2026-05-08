-- Tier enum
create type public.subscription_tier as enum ('free', 'paid');

-- Subscribers table
create table public.subscribers (
  user_id uuid primary key,
  tier public.subscription_tier not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscribers enable row level security;

create policy "Users can view their own subscription"
  on public.subscribers for select
  to authenticated
  using (auth.uid() = user_id);

-- (No insert/update/delete policies for users; only service role / triggers manage this.)

create trigger subscribers_set_updated_at
  before update on public.subscribers
  for each row execute function public.set_updated_at();

-- Auto-create a free subscriber row for new users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  insert into public.subscribers (user_id, tier)
  values (new.id, 'free')
  on conflict do nothing;

  return new;
end;
$$;

-- Backfill existing users
insert into public.subscribers (user_id, tier)
select id, 'free' from auth.users
on conflict do nothing;

-- Helper: is this user currently paid?
create or replace function public.is_paid_user(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscribers
    where user_id = _user_id
      and tier = 'paid'
      and (current_period_end is null or current_period_end > now())
  )
$$;

-- Usage counters (current calendar month, UTC)
create or replace function public.requests_posted_this_month(_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.requests
  where user_id = _user_id
    and created_at >= date_trunc('month', now())
$$;

create or replace function public.orders_taken_this_month(_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.requests
  where taken_by = _user_id
    and taken_at >= date_trunc('month', now())
$$;

-- Enforce 20 posted requests / month for free users
create or replace function public.enforce_request_post_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_paid_user(new.user_id) then
    return new;
  end if;

  if public.requests_posted_this_month(new.user_id) >= 20 then
    raise exception 'Free tier limit reached: you can post up to 20 requests per month. Upgrade to continue.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_request_post_limit_trg
  before insert on public.requests
  for each row execute function public.enforce_request_post_limit();

-- Enforce 20 orders taken / month for free users (when taken_by transitions to a user)
create or replace function public.enforce_order_take_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only check when taken_by is being set (null -> uuid) or changed to a different user
  if new.taken_by is not null
     and (old.taken_by is null or old.taken_by is distinct from new.taken_by)
  then
    if public.is_paid_user(new.taken_by) then
      return new;
    end if;

    if public.orders_taken_this_month(new.taken_by) >= 20 then
      raise exception 'Free tier limit reached: you can take up to 20 orders per month. Upgrade to continue.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger enforce_order_take_limit_trg
  before update on public.requests
  for each row execute function public.enforce_order_take_limit();