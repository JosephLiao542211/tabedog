-- TabeDog schema
-- 1. scrape_cache: server-side cache of scraped Tabelog pages. Only the service role touches it.
-- 2. favorites:    places a signed-in user has saved. Row Level Security keeps rows per user.

create table if not exists public.scrape_cache (
  key        text primary key,
  value      jsonb not null,
  expires_at timestamptz not null
);
create index if not exists scrape_cache_expires_idx on public.scrape_cache (expires_at);
alter table public.scrape_cache enable row level security;
-- no policies: anon/authenticated roles cannot read or write; the service role bypasses RLS
revoke all on public.scrape_cache from anon, authenticated;

create or replace function public.purge_scrape_cache()
returns integer
language sql
security definer
set search_path = public
as $$
  with d as (delete from public.scrape_cache where expires_at < now() returning 1)
  select count(*)::integer from d;
$$;
revoke all on function public.purge_scrape_cache() from public, anon, authenticated;

create table if not exists public.favorites (
  user_id       uuid not null references auth.users (id) on delete cascade,
  restaurant_id text not null,
  name          text not null,
  url           text not null,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index if not exists favorites_user_created_idx on public.favorites (user_id, created_at desc);
alter table public.favorites enable row level security;

create policy "favorites: users read their own"
  on public.favorites for select to authenticated
  using (auth.uid() = user_id);
create policy "favorites: users insert their own"
  on public.favorites for insert to authenticated
  with check (auth.uid() = user_id);
create policy "favorites: users update their own"
  on public.favorites for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "favorites: users delete their own"
  on public.favorites for delete to authenticated
  using (auth.uid() = user_id);
