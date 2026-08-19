create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  role text,
  company text not null check (char_length(company) between 1 and 200),
  email text,
  profile_url text,
  contact_type text not null default 'recruiter'
    check (contact_type in ('recruiter', 'hiring_manager', 'peer_target_role')),
  source text not null default 'csv' check (source in ('csv', 'manual')),
  dedupe_key text not null,
  consented_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dedupe_key),
  check (email is not null or profile_url is not null)
);

create index if not exists outreach_contacts_user_company_idx
  on public.outreach_contacts (user_id, company, name);

alter table public.outreach_contacts enable row level security;

create policy "outreach_contacts_select_own" on public.outreach_contacts
  for select to authenticated using (auth.uid() = user_id);
create policy "outreach_contacts_insert_own" on public.outreach_contacts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "outreach_contacts_update_own" on public.outreach_contacts
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "outreach_contacts_delete_own" on public.outreach_contacts
  for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists outreach_contacts_set_updated_at on public.outreach_contacts;
create trigger outreach_contacts_set_updated_at before update on public.outreach_contacts
  for each row execute function public.set_updated_at();
