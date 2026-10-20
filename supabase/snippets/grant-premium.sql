-- Grant or revoke Premium for a user. Run in Supabase Studio's SQL editor (or psql as postgres).
-- Nobody can change their own plan from the app; only this, the service role, or a billing webhook can.

-- Upgrade by email (no expiry):
update public.profiles p set plan = 'premium', premium_until = null
from auth.users u where u.id = p.id and u.email = 'someone@example.com';

-- Upgrade for one month:
-- update public.profiles p set plan = 'premium', premium_until = now() + interval '1 month'
-- from auth.users u where u.id = p.id and u.email = 'someone@example.com';

-- Back to free:
-- update public.profiles p set plan = 'free', premium_until = null
-- from auth.users u where u.id = p.id and u.email = 'someone@example.com';

-- Who is on what:
-- select u.email, p.plan, p.premium_until from public.profiles p join auth.users u on u.id = p.id order by u.email;
