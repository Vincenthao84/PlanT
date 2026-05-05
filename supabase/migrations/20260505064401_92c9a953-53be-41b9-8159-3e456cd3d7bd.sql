create table public.request_ratings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  requester_id uuid not null,
  taker_id uuid not null,
  stars smallint not null check (stars between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.request_ratings enable row level security;

create policy "Participants can view ratings"
on public.request_ratings for select to authenticated
using (auth.uid() = requester_id or auth.uid() = taker_id);

create policy "Requester can insert rating for completed request"
on public.request_ratings for insert to authenticated
with check (
  auth.uid() = requester_id
  and exists (
    select 1 from public.requests r
    where r.id = request_id
      and r.user_id = auth.uid()
      and r.taken_by = taker_id
      and r.completed_at is not null
      and r.taker_completed_at is not null
  )
);

create policy "Requester can update their rating"
on public.request_ratings for update to authenticated
using (auth.uid() = requester_id)
with check (auth.uid() = requester_id);

create policy "Requester can delete their rating"
on public.request_ratings for delete to authenticated
using (auth.uid() = requester_id);

create trigger request_ratings_set_updated_at
before update on public.request_ratings
for each row execute function public.set_updated_at();

create index idx_request_ratings_taker on public.request_ratings(taker_id);