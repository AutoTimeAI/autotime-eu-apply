-- Job ingestion remains separate from user-owned candidate/application data.
create table if not exists public.job_listings (
  id uuid primary key default gen_random_uuid(), title text not null, company text not null,
  location text, url text not null, posted_date date, source text not null,
  ats_platform text not null default 'unknown', description_raw text,
  dedup_hash text not null unique, identity_hash text not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists job_listings_company_idx on public.job_listings (company);
create index if not exists job_listings_ats_platform_idx on public.job_listings (ats_platform);
create unique index if not exists job_listings_identity_hash_idx on public.job_listings (identity_hash);

create table if not exists public.company_ats_slugs (
  id uuid primary key default gen_random_uuid(), company_name text not null,
  ats_platform text not null check (ats_platform in ('greenhouse','lever','ashby','personio')),
  ats_slug text not null, created_at timestamptz not null default now(),
  unique (company_name, ats_platform)
);

alter table public.applications add column if not exists ats_platform text not null default 'unknown';

create table if not exists public.outreach_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.applications(id) on delete cascade,
  recruiter_name text, recruiter_role text, recruiter_email text,
  channel text not null check (channel in ('linkedin_note','linkedin_inmail','email')),
  draft_subject text, draft_body text not null,
  status text not null default 'drafted' check (status in ('drafted','sent','replied','no_response')),
  sent_at timestamptz, follow_up_due timestamptz, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outreach_messages_user_job_idx on public.outreach_messages (user_id, job_id);
create index if not exists outreach_messages_follow_up_idx on public.outreach_messages (user_id, status, follow_up_due);

alter table public.job_listings enable row level security;
alter table public.company_ats_slugs enable row level security;
alter table public.outreach_messages enable row level security;
create policy "job_listings_authenticated_read" on public.job_listings for select to authenticated using (true);
create policy "company_ats_slugs_authenticated_read" on public.company_ats_slugs for select to authenticated using (true);
create policy "outreach_select_own" on public.outreach_messages for select to authenticated using (auth.uid() = user_id);
create policy "outreach_insert_own" on public.outreach_messages for insert to authenticated with check (auth.uid() = user_id);
create policy "outreach_update_own" on public.outreach_messages for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "outreach_delete_own" on public.outreach_messages for delete to authenticated using (auth.uid() = user_id);

drop trigger if exists job_listings_set_updated_at on public.job_listings;
create trigger job_listings_set_updated_at before update on public.job_listings for each row execute function public.set_updated_at();
drop trigger if exists outreach_messages_set_updated_at on public.outreach_messages;
create trigger outreach_messages_set_updated_at before update on public.outreach_messages for each row execute function public.set_updated_at();
