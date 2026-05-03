-- Messages table for taker/requester communication on a request
create table public.request_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  author_id uuid not null,
  body text not null default '',
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_request_messages_request_id on public.request_messages(request_id, created_at);

alter table public.request_messages enable row level security;

-- Helper: is current user a participant (owner or taker) of the request?
create or replace function public.is_request_participant(_request_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.requests r
    where r.id = _request_id
      and (r.user_id = _user_id or r.taken_by = _user_id)
  )
$$;

create policy "Participants can view messages"
  on public.request_messages for select
  to authenticated
  using (public.is_request_participant(request_id, auth.uid()));

create policy "Participants can send messages"
  on public.request_messages for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_request_participant(request_id, auth.uid())
  );

create policy "Authors can delete their own messages"
  on public.request_messages for delete
  to authenticated
  using (auth.uid() = author_id);

-- Storage bucket for task photos (public read)
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', true)
on conflict (id) do nothing;

create policy "Task photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'task-photos');

create policy "Authenticated users can upload task photos to their folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own task photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
