-- One-time setup for the blog queue's pg_cron ping (see migrations/20261026000000_blog_agent_runs.sql).
-- Run in the SQL editor with the production URL and the same CRON_SECRET the Vercel project has.
-- Until both secrets exist the cron job does nothing.
select vault.create_secret('https://tabedog.com/api/cron/blog-queue', 'blog_queue_url');
select vault.create_secret('<CRON_SECRET>', 'cron_secret');

-- To change them later:
-- select vault.update_secret((select id from vault.secrets where name = 'cron_secret'), '<new secret>');
-- Recent pings and their HTTP status:
-- select status_code, content, created from net._http_response order by created desc limit 20;
