-- Blog drafting agent, run on the server.
-- 1. blog_agent_runs:     one row per drafting session. The agent runs in the background and saves its
--                         UI messages here every few seconds, so several can run at once and the
--                         dashboard just polls. Setting status to 'stopping' asks the runner to abort.
-- 2. blog_queue:          single-line prompts waiting to be drafted unattended, in `position` order.
-- 3. blog_queue_settings: one row: on/off, how often, which model, and whether finished drafts publish.
-- 4. pg_cron:             every 15 minutes, if the queue is due, pings /api/cron/blog-queue (the URL and
--                         secret live in Vault; see supabase/snippets/blog-queue-cron.sql). Vercel Hobby
--                         crons only run daily, so the schedule lives here.
-- All three tables are service-role only: RLS on, no policies.
-- 5. posts.author_color, and spreading pen names and avatar colors over unsigned posts (at the end).

create table if not exists public.blog_agent_runs (
  id              uuid primary key default gen_random_uuid(),
  label           text not null default '',          -- the idea or queued prompt, for the run list
  title           text not null default '',          -- the latest draft's headline
  source          text not null default 'manual' check (source in ('manual', 'queue')),
  model           text not null,
  status          text not null default 'running' check (status in ('running', 'stopping', 'ready', 'stopped', 'error')),
  error           text,
  messages        jsonb not null default '[]',
  photo_overrides jsonb not null default '{}',
  post_id         uuid references public.posts (id) on delete set null,
  segments        int not null default 0,            -- function invocations used, to cap time-limit hand-offs
  stalls          int not null default 0,            -- hand-offs in a row that finished no step: retry at lower effort, then give up
  heartbeat_at    timestamptz not null default now(), -- a running row that stops beating was killed mid-run
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists blog_agent_runs_created_idx on public.blog_agent_runs (created_at desc);
alter table public.blog_agent_runs enable row level security;

drop trigger if exists blog_agent_runs_touch_updated_at on public.blog_agent_runs;
create trigger blog_agent_runs_touch_updated_at
  before update on public.blog_agent_runs
  for each row execute function public.touch_updated_at();

create table if not exists public.blog_queue (
  id         uuid primary key default gen_random_uuid(),
  prompt     text not null check (length(trim(prompt)) > 0),
  position   double precision not null default 0,
  status     text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  run_id     uuid references public.blog_agent_runs (id) on delete set null,
  error      text,
  started_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists blog_queue_next_idx on public.blog_queue (position, created_at) where status = 'queued';
alter table public.blog_queue enable row level security;

create table if not exists public.blog_queue_settings (
  id             int primary key default 1 check (id = 1),
  enabled        boolean not null default false,
  interval_hours int not null default 4 check (interval_hours between 1 and 168),
  model          text not null default 'claude-opus-5-5',
  auto_publish   boolean not null default false,
  last_run_at    timestamptz
);
insert into public.blog_queue_settings (id) values (1) on conflict (id) do nothing;
alter table public.blog_queue_settings enable row level security;

-- Due (or forced) + something queued: mark the next prompt running and stamp the clock, atomically,
-- so overlapping cron pings can't start the same prompt twice.
create or replace function public.blog_queue_claim(force boolean default false)
returns setof public.blog_queue
language plpgsql security definer set search_path = public as $$
declare
  s public.blog_queue_settings;
  q public.blog_queue;
begin
  select * into s from public.blog_queue_settings where id = 1 for update;
  if not force and (not s.enabled or s.last_run_at > now() - make_interval(hours => s.interval_hours) + interval '5 minutes') then
    return;
  end if;
  select * into q from public.blog_queue where status = 'queued' order by position, created_at limit 1 for update skip locked;
  if not found then return; end if;
  update public.blog_queue set status = 'running', started_at = now() where id = q.id returning * into q;
  update public.blog_queue_settings set last_run_at = now() where id = 1;
  return next q;
end $$;
revoke execute on function public.blog_queue_claim(boolean) from public, anon, authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Only calls out when a run is due, so the 96 daily ticks cost nothing until then.
select cron.schedule('blog-queue', '*/15 * * * *', $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'blog_queue_url'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    timeout_milliseconds := 15000
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'blog_queue_url')
    and exists (select 1 from public.blog_queue where status = 'queued')
    and exists (select 1 from public.blog_queue_settings
                where enabled and (last_run_at is null or last_run_at <= now() - make_interval(hours => interval_hours) + interval '5 minutes'))
$cron$);

-- 5. Bylines. An unsigned post used to show a pen name hashed from its slug, colored by the name, so
--    neighbours often matched. Now the dashboard picks a name and a dog-avatar color when the post is
--    saved, avoiding the latest posts' picks, and stores them. Existing unsigned posts get spread out
--    here in publish order. Keep the lists in sync with PEN_NAMES and AVATAR_COLORS in lib/blog.ts.
alter table public.posts add column if not exists author_color text;

with pens(i, name, role) as (values
  (0, 'Hachi', 'Food editor, TabeDog'), (1, 'Mochi', 'Ramen & noodles, TabeDog'), (2, 'Kuro', 'Izakaya & nightlife, TabeDog'),
  (3, 'Shiro', 'Sushi & seafood, TabeDog'), (4, 'Kuma', 'Travel & neighborhoods, TabeDog'), (5, 'Pochi', 'Cafes & sweets, TabeDog')),
unsigned as (
  select id, (row_number() over (order by coalesce(published_at, created_at), created_at) - 1)::int as n
  from public.posts where trim(author_name) in ('', 'Joseph L') -- unsigned, or the founder (OPERATOR.name), who shows as a pen name
)
update public.posts p set author_name = pens.name, author_role = pens.role
from unsigned u join pens on pens.i = u.n % 6
where p.id = u.id;

with colors(i, color) as (values (0, '#ff6347'), (1, '#2f7de1'), (2, '#2e9e6b'), (3, '#8a5cd6'), (4, '#e08a1e'), (5, '#d6457a'), (6, '#1f8a99'), (7, '#5b6b2e')),
bare as (
  select id, (row_number() over (order by coalesce(published_at, created_at), created_at) - 1)::int as n
  from public.posts where author_avatar is null and author_color is null
)
update public.posts p set author_color = colors.color
from bare b join colors on colors.i = (b.n * 3) % 8 -- a stride of 3 so a post's color doesn't track its name
where p.id = b.id;
