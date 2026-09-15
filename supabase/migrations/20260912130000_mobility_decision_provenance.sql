-- Privacy-compatible immutable candidate, vacancy, employer and decision lineage.
-- Personal rows reject updates but remain deletable by trusted retention/account flows.

begin;

do $preflight$
declare
  object_name text;
begin
  foreach object_name in array array[
    'mobility_candidate_evidence_items', 'mobility_candidate_evidence_versions',
    'mobility_vacancy_snapshots', 'mobility_employer_registers',
    'mobility_employer_register_versions', 'mobility_employer_register_rows',
    'mobility_employer_verifications', 'mobility_decision_records',
    'mobility_decision_evidence_links', 'mobility_decision_corrections',
    'mobility_decision_replays'
  ] loop
    if to_regclass('public.' || object_name) is not null then
      raise exception 'mobility decision provenance preflight failed: public.% already exists', object_name;
    end if;
  end loop;
  if to_regprocedure('public.reject_mobility_version_update()') is not null then
    raise exception 'mobility decision provenance preflight failed: update trigger function already exists';
  end if;
end
$preflight$;

create function public.reject_mobility_version_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'versioned mobility records cannot be updated; append a successor';
end;
$$;

create table public.mobility_candidate_evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  sensitivity text not null check (sensitivity in ('ordinary', 'sensitive', 'highly_sensitive')),
  created_at timestamptz not null default now(),
  constraint mobility_candidate_evidence_items_subject_present check (length(trim(subject)) > 0)
);

create table public.mobility_candidate_evidence_versions (
  id uuid primary key default gen_random_uuid(),
  evidence_item_id uuid not null references public.mobility_candidate_evidence_items(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null check (status in (
    'verified', 'user_declared', 'inferred', 'conflicting', 'stale', 'missing', 'unknown'
  )),
  source_kind text not null check (source_kind in (
    'candidate_profile', 'cv', 'portfolio', 'vacancy',
    'official_source', 'user_confirmation', 'system_inference'
  )),
  source_label text not null,
  value_sha256 text not null check (value_sha256 ~ '^[a-f0-9]{64}$'),
  encrypted_payload_reference text,
  confirmed_at timestamptz,
  expires_at timestamptz,
  predecessor_version_id uuid references public.mobility_candidate_evidence_versions(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  unique (evidence_item_id, version),
  constraint mobility_candidate_evidence_versions_source_present check (length(trim(source_label)) > 0),
  constraint mobility_candidate_evidence_versions_lineage check (
    (version = 1 and predecessor_version_id is null)
    or (version > 1 and predecessor_version_id is not null)
  )
);

create table public.mobility_vacancy_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_reference text,
  source_url text,
  employing_entity_claim text,
  title text not null,
  country text not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  encrypted_payload_reference text,
  captured_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_vacancy_snapshots_title_present check (length(trim(title)) > 0),
  constraint mobility_vacancy_snapshots_country_present check (length(trim(country)) > 0)
);

create table public.mobility_employer_registers (
  id text primary key,
  jurisdiction text not null,
  register_name text not null,
  source_document_id uuid not null references public.mobility_source_documents(id),
  created_at timestamptz not null default now(),
  constraint mobility_employer_registers_id_present check (length(trim(id)) > 0)
);

create table public.mobility_employer_register_versions (
  id uuid primary key default gen_random_uuid(),
  register_id text not null references public.mobility_employer_registers(id),
  version integer not null check (version > 0),
  source_version_id uuid not null references public.mobility_source_versions(id),
  status text not null check (status in ('current', 'stale', 'quarantined', 'superseded')),
  effective_from timestamptz,
  effective_to timestamptz,
  predecessor_version_id uuid references public.mobility_employer_register_versions(id),
  recorded_at timestamptz not null default now(),
  unique (register_id, version),
  constraint mobility_employer_register_versions_interval check (
    effective_to is null or effective_from is null or effective_to > effective_from
  ),
  constraint mobility_employer_register_versions_lineage check (
    (version = 1 and predecessor_version_id is null)
    or (version > 1 and predecessor_version_id is not null)
  )
);

create table public.mobility_employer_register_rows (
  id uuid primary key default gen_random_uuid(),
  register_version_id uuid not null references public.mobility_employer_register_versions(id),
  legal_identifier text not null,
  legal_name text not null,
  valid_from timestamptz,
  valid_to timestamptz,
  source_locator text not null,
  row_sha256 text not null check (row_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now(),
  unique (register_version_id, legal_identifier),
  constraint mobility_employer_register_rows_name_present check (length(trim(legal_name)) > 0),
  constraint mobility_employer_register_rows_interval check (
    valid_to is null or valid_from is null or valid_to > valid_from
  )
);

create table public.mobility_employer_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vacancy_snapshot_id uuid not null references public.mobility_vacancy_snapshots(id) on delete cascade,
  register_version_id uuid references public.mobility_employer_register_versions(id),
  register_row_id uuid references public.mobility_employer_register_rows(id),
  claimed_name text not null,
  claimed_identifier text,
  state text not null check (state in ('verified', 'ambiguous', 'not_found', 'stale', 'not_applicable')),
  match_method text not null check (match_method in (
    'exact_legal_identifier', 'exact_legal_name', 'candidate_selection', 'none'
  )),
  reason_codes text[] not null,
  checked_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_employer_verifications_reasons_present check (cardinality(reason_codes) > 0),
  constraint mobility_employer_verifications_verified_evidence check (
    state <> 'verified'
    or (register_version_id is not null and register_row_id is not null
        and match_method in ('exact_legal_identifier', 'exact_legal_name'))
  )
);

create table public.mobility_decision_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vacancy_snapshot_id uuid not null references public.mobility_vacancy_snapshots(id) on delete cascade,
  employer_verification_id uuid references public.mobility_employer_verifications(id) on delete set null,
  rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  mobility_state text not null check (mobility_state in (
    'potential_match', 'not_supported', 'insufficient_evidence', 'source_conflict',
    'employer_unverified', 'ruleset_quarantined', 'expert_review_required', 'information_only'
  )),
  employer_state text not null check (employer_state in (
    'verified', 'ambiguous', 'not_found', 'stale', 'not_applicable'
  )),
  output_permission text not null check (output_permission in (
    'definitive', 'conditional', 'information_only',
    'regulated_review', 'authority_review', 'blocked'
  )),
  reason_codes text[] not null,
  canonical_output jsonb not null,
  canonical_output_sha256 text not null check (canonical_output_sha256 ~ '^[a-f0-9]{64}$'),
  supersedes_decision_id uuid references public.mobility_decision_records(id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint mobility_decision_records_reasons_present check (cardinality(reason_codes) > 0),
  constraint mobility_decision_records_output_object check (jsonb_typeof(canonical_output) = 'object'),
  constraint mobility_decision_records_no_self_supersession check (supersedes_decision_id is null or supersedes_decision_id <> id)
);

create table public.mobility_decision_evidence_links (
  decision_id uuid not null references public.mobility_decision_records(id) on delete cascade,
  claim_version_id uuid not null references public.mobility_claim_versions(id),
  source_span_id uuid not null references public.mobility_source_spans(id),
  candidate_evidence_version_id uuid references public.mobility_candidate_evidence_versions(id) on delete set null,
  relation text not null check (relation in ('supports', 'contradicts', 'limits')),
  primary key (decision_id, claim_version_id, source_span_id, relation)
);

create table public.mobility_decision_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_decision_id uuid not null references public.mobility_decision_records(id) on delete cascade,
  successor_decision_id uuid references public.mobility_decision_records(id) on delete set null,
  target_type text not null check (target_type in ('candidate_evidence', 'vacancy', 'employer', 'claim', 'source', 'rule', 'output')),
  target_id text not null,
  reason text not null,
  state text not null check (state in ('submitted', 'triaged', 'accepted', 'rejected', 'superseded')),
  submitted_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint mobility_decision_corrections_reason_present check (length(trim(reason)) > 0),
  constraint mobility_decision_corrections_resolution check (
    (state in ('submitted', 'triaged') and resolved_at is null)
    or (state in ('accepted', 'rejected', 'superseded') and resolved_at is not null)
  )
);

create table public.mobility_decision_replays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  original_decision_id uuid not null references public.mobility_decision_records(id) on delete cascade,
  replay_rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  replay_decision_id uuid references public.mobility_decision_records(id) on delete set null,
  mode text not null check (mode in ('original_versions', 'successor_comparison')),
  idempotency_key text not null unique,
  state text not null check (state in ('queued', 'running', 'succeeded', 'failed')),
  equivalent boolean,
  diff jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  recorded_at timestamptz not null default now(),
  constraint mobility_decision_replays_terminal_state check (
    (state in ('queued', 'running') and completed_at is null)
    or (state in ('succeeded', 'failed') and completed_at is not null)
  )
);

create index mobility_candidate_evidence_versions_item_idx
  on public.mobility_candidate_evidence_versions(evidence_item_id, version desc);
create index mobility_employer_register_rows_identity_idx
  on public.mobility_employer_register_rows(register_version_id, legal_identifier, legal_name);
create index mobility_decision_records_user_time_idx
  on public.mobility_decision_records(user_id, recorded_at desc);
create index mobility_decision_corrections_original_idx
  on public.mobility_decision_corrections(original_decision_id, submitted_at);
create index mobility_decision_replays_original_idx
  on public.mobility_decision_replays(original_decision_id, recorded_at desc);

do $immutable_updates$
declare
  table_name text;
begin
  foreach table_name in array array[
    'mobility_candidate_evidence_items', 'mobility_candidate_evidence_versions',
    'mobility_vacancy_snapshots', 'mobility_employer_registers',
    'mobility_employer_register_versions', 'mobility_employer_register_rows',
    'mobility_employer_verifications', 'mobility_decision_records',
    'mobility_decision_evidence_links'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.reject_mobility_version_update()',
      table_name || '_no_update', table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end
$immutable_updates$;

alter table public.mobility_decision_corrections enable row level security;
alter table public.mobility_decision_replays enable row level security;
revoke all on public.mobility_decision_corrections from anon, authenticated;
revoke all on public.mobility_decision_replays from anon, authenticated;

revoke all on function public.reject_mobility_version_update() from public, anon, authenticated;

commit;
