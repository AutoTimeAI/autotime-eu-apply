-- Turns the existing (previously unenforced) beta_access table into a real
-- access gate: apps/web/app/dashboard/layout.tsx now redirects any signed-in
-- user whose beta_access.status isn't 'active' to /waitlist. Since no
-- beta_access row is created automatically on signup, a NEW user simply has
-- no row - the app layer treats "no row" as equivalent to 'pending', so no
-- trigger on auth.users is needed here. This migration only needs to
-- grandfather every user who already exists today as 'active', so nobody
-- currently using the product is locked out the moment the gate goes live.
insert into public.beta_access (user_id, status, approved_at, updated_at)
select id, 'active', now(), now()
from auth.users
on conflict (user_id) do nothing;
