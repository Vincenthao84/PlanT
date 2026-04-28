create type public.request_type as enum ('snap','knowledge','action','object','rental','anything');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.request_type not null,
  title text not null,
  description text not null default '',
  location_label text not null default '',
  lat double precision not null,
  lng double precision not null,
  reward text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index requests_user_id_idx on public.requests(user_id);
create index requests_created_at_idx on public.requests(created_at desc);

alter table public.requests enable row level security;

create policy "Requests are viewable by authenticated users"
  on public.requests for select
  to authenticated
  using (true);

create policy "Users can create their own requests"
  on public.requests for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own requests"
  on public.requests for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own requests"
  on public.requests for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();