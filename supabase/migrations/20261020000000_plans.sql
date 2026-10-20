-- Free vs premium users.
-- 1. profiles:     one row per auth user holding their plan. Created automatically on sign-up.
-- 2. is_premium(): the single place that decides whether a user is premium right now.
-- 3. lists / list_items write policies now require premium. Reads stay open so a lapsed
--    subscriber keeps their data and gets it back the moment they upgrade again.
--
-- Nobody can change their own plan from the browser: there is no update policy for
-- authenticated users. Grant premium with the service role or from the SQL editor:
--   update public.profiles set plan = 'premium' where id = '<user uuid>';
-- or, for a time-boxed subscription:
--   update public.profiles set plan = 'premium', premium_until = now() + interval '1 month' where id = '<user uuid>';

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  plan          text not null default 'free' check (plan in ('free', 'premium')),
  premium_until timestamptz,          -- null = no expiry while plan = 'premium'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: users read their own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);
-- no insert / update / delete policies: only the service role (billing webhooks, admin) can change a plan

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Every new auth user gets a free profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this migration.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- True while the user's plan is premium and (if set) has not expired.
create or replace function public.is_premium(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.plan = 'premium'
      and (p.premium_until is null or p.premium_until > now())
  );
$$;
revoke all on function public.is_premium(uuid) from public;
grant execute on function public.is_premium(uuid) to authenticated, service_role;

-- Saving lists is a premium feature: rewrite the write policies, keep the read policies.
drop policy if exists "lists: users insert their own" on public.lists;
drop policy if exists "lists: users update their own" on public.lists;
drop policy if exists "lists: users delete their own, never the main one" on public.lists;

create policy "lists: premium users insert their own"
  on public.lists for insert to authenticated
  with check (auth.uid() = user_id and public.is_premium(auth.uid()));
create policy "lists: premium users update their own"
  on public.lists for update to authenticated
  using (auth.uid() = user_id and public.is_premium(auth.uid()))
  with check (auth.uid() = user_id and public.is_premium(auth.uid()));
create policy "lists: premium users delete their own, never the main one"
  on public.lists for delete to authenticated
  using (auth.uid() = user_id and not is_main and public.is_premium(auth.uid()));

drop policy if exists "list_items: users insert into their own lists" on public.list_items;
drop policy if exists "list_items: users update their own" on public.list_items;
drop policy if exists "list_items: users delete their own" on public.list_items;

create policy "list_items: premium users insert into their own lists"
  on public.list_items for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.is_premium(auth.uid())
    and exists (select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid())
  );
create policy "list_items: premium users update their own"
  on public.list_items for update to authenticated
  using (auth.uid() = user_id and public.is_premium(auth.uid()))
  with check (auth.uid() = user_id and public.is_premium(auth.uid()));
create policy "list_items: premium users delete their own"
  on public.list_items for delete to authenticated
  using (auth.uid() = user_id and public.is_premium(auth.uid()));
