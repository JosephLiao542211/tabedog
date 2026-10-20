-- Saved places become playlists.
-- 1. lists:      a user's named, coloured lists. Exactly one per user is the main "Liked" list.
-- 2. list_items: the places in each list (restaurant snapshot copied from search results).
-- Existing rows in `favorites` move into each user's main list, then `favorites` goes away.

create table if not exists public.lists (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  color      text not null default 'coral'
             check (color in ('coral','orange','gold','lime','green','teal','sky','blue','violet','purple','pink','slate')),
  is_main    boolean not null default false,
  visible    boolean not null default true,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists lists_one_main_per_user on public.lists (user_id) where is_main;
create index if not exists lists_user_order_idx on public.lists (user_id, is_main desc, position, created_at);
alter table public.lists enable row level security;

create policy "lists: users read their own"
  on public.lists for select to authenticated
  using (auth.uid() = user_id);
create policy "lists: users insert their own"
  on public.lists for insert to authenticated
  with check (auth.uid() = user_id);
create policy "lists: users update their own"
  on public.lists for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lists: users delete their own, never the main one"
  on public.lists for delete to authenticated
  using (auth.uid() = user_id and not is_main);

create table if not exists public.list_items (
  list_id       uuid not null references public.lists (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  restaurant_id text not null,
  name          text not null,
  url           text not null,
  data          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  primary key (list_id, restaurant_id)
);
create index if not exists list_items_user_created_idx on public.list_items (user_id, created_at desc);
alter table public.list_items enable row level security;

create policy "list_items: users read their own"
  on public.list_items for select to authenticated
  using (auth.uid() = user_id);
create policy "list_items: users insert into their own lists"
  on public.list_items for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()));
create policy "list_items: users update their own"
  on public.list_items for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "list_items: users delete their own"
  on public.list_items for delete to authenticated
  using (auth.uid() = user_id);

-- Move existing favorites into a main "Liked" list per user.
insert into public.lists (user_id, name, color, is_main, position)
select distinct user_id, 'Liked', 'coral', true, 0 from public.favorites
on conflict do nothing;

insert into public.list_items (list_id, user_id, restaurant_id, name, url, data, created_at)
select l.id, f.user_id, f.restaurant_id, f.name, f.url, f.data, f.created_at
from public.favorites f
join public.lists l on l.user_id = f.user_id and l.is_main
on conflict do nothing;

drop table public.favorites;
