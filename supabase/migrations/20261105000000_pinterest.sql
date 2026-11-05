-- Pinterest pipeline: AI turns published blog guides into pins, an admin reviews them, and a
-- pg_cron tick posts the queue to Pinterest a few times a day.
-- 1. pinterest_account:  one row: the connected account's OAuth tokens. Service role only.
-- 2. pinterest_settings: one row: on/off, pins per day, autopilot, default board, model.
-- 3. pins:               one row per pin, from AI draft to posted. `design` is what the image renders.
-- 4. pinterest_claim():  takes the next queued pin when one is due, atomically.
-- 5. pg_cron:            every 15 minutes, while a pin is due, pings /api/cron/pinterest. It reuses the
--                        blog queue's Vault secrets (cron_secret, and blog_queue_url with the path swapped).
-- All tables are service-role only: RLS on, no policies.

create table if not exists public.pinterest_account (
  id                 int primary key default 1 check (id = 1),
  username           text not null default '',
  access_token       text not null,
  refresh_token      text,
  scope              text not null default '',
  access_expires_at  timestamptz not null,
  refresh_expires_at timestamptz,
  sandbox            boolean not null default false,
  connected_at       timestamptz not null default now(),
  refreshed_at       timestamptz not null default now()
);
alter table public.pinterest_account enable row level security;

create table if not exists public.pinterest_settings (
  id                 int primary key default 1 check (id = 1),
  enabled            boolean not null default false,   -- post the queue automatically
  pins_per_day       int not null default 3 check (pins_per_day between 1 and 25),
  autopilot          boolean not null default false,   -- create pins for published posts on its own
  auto_approve       boolean not null default false,   -- autopilot pins skip review and go straight to the queue
  default_board_id   text,
  default_board_name text not null default '',
  model              text not null default 'claude-sonnet-5-5',
  last_post_at       timestamptz,
  last_post_id       uuid,                              -- the blog post pinned last, so neighbours differ
  last_generate_at   timestamptz
);
insert into public.pinterest_settings (id) values (1) on conflict (id) do nothing;
alter table public.pinterest_settings enable row level security;

create table if not exists public.pins (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.posts (id) on delete cascade,
  status        text not null default 'draft' check (status in ('draft', 'queued', 'posting', 'posted', 'failed')),
  source        text not null default 'manual' check (source in ('manual', 'autopilot')),
  board_id      text,                                    -- null = the default board at posting time
  board_name    text not null default '',
  title         text not null default '',
  description   text not null default '',
  alt_text      text not null default '',
  link          text not null,
  design        jsonb not null default '{}',
  position      double precision not null default 0,     -- queue order
  attempts      int not null default 0,
  error         text,
  pinterest_id  text,
  posted_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists pins_post_idx on public.pins (post_id);
create index if not exists pins_queue_idx on public.pins (position, created_at) where status = 'queued';
create index if not exists pins_status_idx on public.pins (status, updated_at desc);
alter table public.pins enable row level security;

drop trigger if exists pins_touch_updated_at on public.pins;
create trigger pins_touch_updated_at
  before update on public.pins
  for each row execute function public.touch_updated_at();

-- Due (or forced) + something queued: mark the next pin posting and stamp the clock, atomically, so
-- overlapping pings can't post the same pin twice. Prefers a pin for a different post than the last one.
create or replace function public.pinterest_claim(force boolean default false)
returns setof public.pins
language plpgsql security definer set search_path = public as $$
declare
  s public.pinterest_settings;
  p public.pins;
begin
  select * into s from public.pinterest_settings where id = 1 for update;
  if not force and (not s.enabled or s.last_post_at > now() - make_interval(secs => 86400.0 / s.pins_per_day) + interval '5 minutes') then
    return;
  end if;
  select * into p from public.pins where status = 'queued'
    order by (post_id is not distinct from s.last_post_id), position, created_at
    limit 1 for update skip locked;
  if not found then return; end if;
  update public.pins set status = 'posting', attempts = attempts + 1, error = null where id = p.id returning * into p;
  update public.pinterest_settings set last_post_at = now(), last_post_id = p.post_id where id = 1;
  return next p;
end $$;
revoke execute on function public.pinterest_claim(boolean) from public, anon, authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Only calls out when a pin is due and there's something to post (or autopilot could make some).
select cron.schedule('pinterest', '*/15 * * * *', $cron$
  select net.http_post(
    url := replace((select decrypted_secret from vault.decrypted_secrets where name = 'blog_queue_url'), '/api/cron/blog-queue', '/api/cron/pinterest'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    timeout_milliseconds := 15000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'blog_queue_url')
    and exists (select 1 from public.pinterest_account)
    and exists (select 1 from public.pinterest_settings s
                where s.enabled
                  and (s.last_post_at is null or s.last_post_at <= now() - make_interval(secs => 86400.0 / s.pins_per_day) + interval '5 minutes')
                  and (s.autopilot or exists (select 1 from public.pins where status = 'queued')))
$cron$);
