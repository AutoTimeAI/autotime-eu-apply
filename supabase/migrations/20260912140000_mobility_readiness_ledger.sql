-- Append-only source-change and derived country-readiness audit ledger.
begin;

create table public.mobility_source_change_events (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.mobility_source_documents(id),
  previous_version_id uuid references public.mobility_source_versions(id),
  observed_version_id uuid references public.mobility_source_versions(id),
  classification text not null check (classification in ('unavailable', 'unchanged', 'transport_only', 'material_content', 'pipeline_changed')),
  quarantine boolean not null,
  review_required boolean not null,
  reason_codes text[] not null,
  observed_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_source_change_events_reasons check (
    classification = 'unchanged' or cardinality(reason_codes) > 0
  ),
  constraint mobility_source_change_events_fail_closed check (
    classification not in ('unavailable', 'material_content', 'pipeline_changed')
    or (quarantine and review_required)
  )
);

create table public.mobility_country_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  expert_signoff_id uuid references public.mobility_expert_signoffs(id),
  source_change_event_ids uuid[] not null default '{}',
  state text not null check (state in ('quarantined', 'research', 'information_only', 'conditional', 'approved')),
  score integer not null check (score between 0 and 100),
  output_permission text not null check (output_permission in ('blocked', 'information_only', 'conditional', 'definitive')),
  reason_codes text[] not null,
  input_facts jsonb not null,
  evaluated_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_country_readiness_inputs_object check (jsonb_typeof(input_facts) = 'object'),
  constraint mobility_country_readiness_fail_closed check (
    output_permission <> 'definitive'
    or (state = 'approved' and expert_signoff_id is not null and cardinality(reason_codes) = 0)
  )
);

create index mobility_source_change_events_document_time_idx
  on public.mobility_source_change_events(source_document_id, observed_at desc);
create index mobility_country_readiness_country_time_idx
  on public.mobility_country_readiness_snapshots(country_code, evaluated_at desc);

create trigger mobility_source_change_events_no_mutation
  before update or delete on public.mobility_source_change_events
  for each row execute function public.reject_mobility_immutable_mutation();
create trigger mobility_country_readiness_snapshots_no_mutation
  before update or delete on public.mobility_country_readiness_snapshots
  for each row execute function public.reject_mobility_immutable_mutation();

alter table public.mobility_source_change_events enable row level security;
alter table public.mobility_country_readiness_snapshots enable row level security;
revoke all on public.mobility_source_change_events from anon, authenticated;
revoke all on public.mobility_country_readiness_snapshots from anon, authenticated;

commit;
