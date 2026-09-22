-- Public, unauthenticated beta-waitlist signup capture. Distinct from
-- beta_access (which gates an already-signed-up user's dashboard access) -
-- this table holds emails from visitors who haven't created an account yet
-- and want to be invited later. Service-role only: no anon/authenticated
-- policies, since the API route uses the admin client exclusively.

create table if not exists public.beta_waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'invited', 'declined')),
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_waitlist_signups_email_present check (length(trim(email)) > 0)
);

drop trigger if exists beta_waitlist_signups_set_updated_at on public.beta_waitlist_signups;
create trigger beta_waitlist_signups_set_updated_at
before update on public.beta_waitlist_signups
for each row
execute function public.set_updated_at();

alter table public.beta_waitlist_signups enable row level security;
