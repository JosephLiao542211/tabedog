-- Stripe billing: remember which Stripe customer / subscription backs a profile.
-- Written only by the server with the service role (webhook + checkout return); users can read their own row.
alter table public.profiles
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text;
create index if not exists profiles_stripe_subscription_idx on public.profiles (stripe_subscription_id);
