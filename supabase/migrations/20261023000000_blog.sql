-- Blog CMS.
-- 1. posts:       one row per article, markdown body. Anyone can read published posts; nobody can
--                 write from the browser. The /admin dashboard writes with the service role after
--                 checking the signed-in user's email against BLOG_ADMIN_EMAILS.
-- 2. blog bucket: public Storage bucket for cover and inline images. Uploads go through signed
--                 upload URLs minted by the dashboard, so there are no insert policies here either.

create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           text not null default '',
  excerpt         text not null default '',      -- the dek under the title; also the fallback meta description
  content         text not null default '',      -- markdown (GFM)
  topic           text not null default 'guides',
  tags            text[] not null default '{}',
  cover_url       text,
  cover_alt       text not null default '',
  author_name     text not null default '',
  author_role     text not null default '',
  author_avatar   text,
  seo_title       text not null default '',      -- empty = use title
  seo_description text not null default '',      -- empty = use excerpt, then the opening paragraph
  focus_keyword   text not null default '',
  canonical_url   text,                          -- only for posts first published elsewhere
  noindex         boolean not null default false,
  featured        boolean not null default false,
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists posts_published_idx on public.posts (published_at desc) where status = 'published';
create index if not exists posts_topic_idx on public.posts (topic, published_at desc) where status = 'published';
alter table public.posts enable row level security;

create policy "posts: anyone reads published"
  on public.posts for select to anon, authenticated
  using (status = 'published' and published_at <= now());

drop trigger if exists posts_touch_updated_at on public.posts;
create trigger posts_touch_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog', 'blog', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'])
on conflict (id) do nothing;
