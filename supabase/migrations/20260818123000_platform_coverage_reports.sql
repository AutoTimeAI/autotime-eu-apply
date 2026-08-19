create table if not exists public.platform_coverage_reports (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  platform text not null,
  site_url text not null check (length(site_url) between 8 and 2000),
  problem_category text not null check (problem_category in ('not_detected','missing_details','incorrect_details','autofill_problem','other')),
  description text check (description is null or length(description) <= 2000),
  extension_version text check (extension_version is null or length(extension_version) <= 40),
  diagnostic_consent boolean not null default false,
  technical_context jsonb not null default '{}'::jsonb check (jsonb_typeof(technical_context) = 'object' and pg_column_size(technical_context) <= 4096),
  requester_hash text not null check (requester_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'new' check (status in ('new','triaged','reproduced','fixed','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_coverage_reports_rate_limit_idx
  on public.platform_coverage_reports (requester_hash, created_at desc);
create index if not exists platform_coverage_reports_status_idx
  on public.platform_coverage_reports (status, created_at desc);

alter table public.platform_coverage_reports enable row level security;
revoke all on table public.platform_coverage_reports from anon, authenticated;
grant select, insert, update on table public.platform_coverage_reports to service_role;
