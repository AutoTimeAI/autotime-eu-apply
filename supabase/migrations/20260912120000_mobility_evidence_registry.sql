-- Additive, server-controlled foundation for versioned mobility evidence.
-- This does not migrate or reinterpret user-editable public.evidence_records.

begin;

do $preflight$
declare
  object_name text;
begin
  foreach object_name in array array[
    'mobility_source_documents', 'mobility_source_versions',
    'mobility_source_spans', 'mobility_claims', 'mobility_claim_versions',
    'mobility_claim_source_spans',
    'mobility_rule_bundles', 'mobility_rule_bundle_versions',
    'mobility_rule_claim_links', 'mobility_expert_signoffs',
    'mobility_rule_bundle_activations'
  ] loop
    if to_regclass('public.' || object_name) is not null then
      raise exception 'mobility evidence registry preflight failed: public.% already exists', object_name;
    end if;
  end loop;

  if to_regclass('auth.users') is null then
    raise exception 'mobility evidence registry preflight failed: auth.users is unavailable';
  end if;
  if to_regprocedure('public.reject_mobility_immutable_mutation()') is not null then
    raise exception 'mobility evidence registry preflight failed: immutable trigger function already exists';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'anon') then
    raise exception 'mobility evidence registry preflight failed: expected API roles are unavailable';
  end if;
end
$preflight$;

create function public.reject_mobility_immutable_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'immutable mobility evidence rows cannot be updated or deleted';
end;
$$;

create table public.mobility_source_documents (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  publisher text not null,
  jurisdiction text not null,
  source_class text not null check (source_class in (
    'legislation', 'administrative_guidance', 'amount_or_statistic',
    'register_or_list', 'official_form', 'other_official'
  )),
  created_at timestamptz not null default now(),
  constraint mobility_source_documents_url_present check (length(trim(canonical_url)) > 0),
  constraint mobility_source_documents_publisher_present check (length(trim(publisher)) > 0),
  constraint mobility_source_documents_jurisdiction_present check (length(trim(jurisdiction)) > 0)
);

create table public.mobility_source_versions (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.mobility_source_documents(id),
  version integer not null check (version > 0),
  retrieved_at timestamptz not null,
  published_at timestamptz,
  effective_from timestamptz,
  effective_to timestamptz,
  expires_at timestamptz,
  language text not null,
  http_status integer not null check (http_status between 100 and 599),
  raw_sha256 text not null check (raw_sha256 ~ '^[a-f0-9]{64}$'),
  normalized_sha256 text not null check (normalized_sha256 ~ '^[a-f0-9]{64}$'),
  snapshot_uri text not null,
  redirect_chain jsonb not null default '[]'::jsonb,
  parser_version text not null,
  normalizer_version text not null,
  captured_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  unique (source_document_id, version),
  constraint mobility_source_versions_effective_interval check (
    effective_to is null or effective_from is null or effective_to > effective_from
  ),
  constraint mobility_source_versions_redirect_array check (jsonb_typeof(redirect_chain) = 'array'),
  constraint mobility_source_versions_snapshot_present check (length(trim(snapshot_uri)) > 0)
);

create table public.mobility_source_spans (
  id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.mobility_source_versions(id),
  locator text not null,
  exact_text text not null,
  exact_text_sha256 text not null check (exact_text_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now(),
  constraint mobility_source_spans_locator_present check (length(trim(locator)) > 0),
  constraint mobility_source_spans_text_present check (length(trim(exact_text)) > 0)
);

create table public.mobility_claims (
  id text primary key,
  jurisdiction text not null,
  route_or_entity text not null,
  created_at timestamptz not null default now(),
  constraint mobility_claims_id_present check (length(trim(id)) > 0),
  constraint mobility_claims_jurisdiction_present check (length(trim(jurisdiction)) > 0),
  constraint mobility_claims_route_present check (length(trim(route_or_entity)) > 0)
);

create table public.mobility_claim_versions (
  id uuid primary key default gen_random_uuid(),
  claim_id text not null references public.mobility_claims(id),
  version integer not null check (version > 0),
  statement text not null,
  claim_type text not null check (claim_type in ('fact', 'derived_fact', 'interpretation')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  state text not null check (state in (
    'draft', 'review_required', 'approved', 'quarantined', 'superseded', 'withdrawn'
  )),
  effective_from timestamptz,
  effective_to timestamptz,
  predecessor_version_id uuid references public.mobility_claim_versions(id),
  recorded_at timestamptz not null default now(),
  unique (claim_id, version),
  constraint mobility_claim_versions_statement_present check (length(trim(statement)) > 0),
  constraint mobility_claim_versions_effective_interval check (
    effective_to is null or effective_from is null or effective_to > effective_from
  ),
  constraint mobility_claim_versions_lineage check (
    (version = 1 and predecessor_version_id is null)
    or (version > 1 and predecessor_version_id is not null)
  )
);

create table public.mobility_claim_source_spans (
  claim_version_id uuid not null references public.mobility_claim_versions(id),
  source_span_id uuid not null references public.mobility_source_spans(id),
  relation text not null check (relation in ('supports', 'contradicts', 'limits')),
  primary key (claim_version_id, source_span_id, relation)
);

create table public.mobility_rule_bundles (
  id text primary key,
  jurisdiction text not null,
  route text not null,
  created_at timestamptz not null default now(),
  constraint mobility_rule_bundles_id_present check (length(trim(id)) > 0),
  constraint mobility_rule_bundles_jurisdiction_present check (length(trim(jurisdiction)) > 0),
  constraint mobility_rule_bundles_route_present check (length(trim(route)) > 0)
);

create table public.mobility_rule_bundle_versions (
  id uuid primary key default gen_random_uuid(),
  bundle_id text not null references public.mobility_rule_bundles(id),
  version integer not null check (version > 0),
  state text not null check (state in (
    'draft', 'review_required', 'approved', 'active',
    'quarantined', 'superseded', 'withdrawn'
  )),
  rules jsonb not null,
  evaluation_case_ids text[] not null,
  effective_from timestamptz,
  effective_to timestamptz,
  predecessor_version_id uuid references public.mobility_rule_bundle_versions(id),
  recorded_at timestamptz not null default now(),
  unique (bundle_id, version),
  constraint mobility_rule_bundle_versions_rules_object check (jsonb_typeof(rules) = 'object'),
  constraint mobility_rule_bundle_versions_cases_present check (cardinality(evaluation_case_ids) > 0),
  constraint mobility_rule_bundle_versions_effective_interval check (
    effective_to is null or effective_from is null or effective_to > effective_from
  ),
  constraint mobility_rule_bundle_versions_lineage check (
    (version = 1 and predecessor_version_id is null)
    or (version > 1 and predecessor_version_id is not null)
  )
);

create table public.mobility_rule_claim_links (
  rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  claim_version_id uuid not null references public.mobility_claim_versions(id),
  critical boolean not null default true,
  primary key (rule_bundle_version_id, claim_version_id)
);

create table public.mobility_expert_signoffs (
  id uuid primary key default gen_random_uuid(),
  rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  reviewer_name text not null,
  reviewer_role text not null,
  qualification_basis text not null,
  scope_reviewed text not null,
  permitted_output_language text not null,
  prohibited_output_language text not null,
  conditions_and_exclusions text not null,
  evidence_snapshot_ids uuid[] not null,
  test_run_id text not null,
  decision text not null check (decision in (
    'approved', 'approved_with_conditions', 'rejected', 'withdrawn'
  )),
  effective_from timestamptz not null,
  review_by timestamptz not null,
  signed_at timestamptz not null,
  signature_reference text not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_expert_signoffs_review_window check (review_by > effective_from),
  constraint mobility_expert_signoffs_snapshots_present check (cardinality(evidence_snapshot_ids) > 0)
);

create table public.mobility_rule_bundle_activations (
  id uuid primary key default gen_random_uuid(),
  rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  action text not null check (action in ('activate', 'quarantine', 'withdraw', 'supersede')),
  reason text not null,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint mobility_rule_bundle_activations_reason_present check (length(trim(reason)) > 0)
);

create unique index mobility_rule_bundle_one_active_idx
  on public.mobility_rule_bundle_versions(bundle_id)
  where state = 'active';
create index mobility_source_versions_time_idx
  on public.mobility_source_versions(source_document_id, effective_from, effective_to);
create index mobility_claim_versions_time_idx
  on public.mobility_claim_versions(claim_id, effective_from, effective_to);

do $immutability$
declare
  table_name text;
begin
  foreach table_name in array array[
    'mobility_source_documents', 'mobility_source_versions', 'mobility_source_spans',
    'mobility_claims', 'mobility_claim_versions', 'mobility_claim_source_spans',
    'mobility_rule_bundles', 'mobility_rule_bundle_versions', 'mobility_rule_claim_links',
    'mobility_expert_signoffs', 'mobility_rule_bundle_activations'
  ] loop
    execute format(
      'create trigger %I before update or delete on public.%I for each row execute function public.reject_mobility_immutable_mutation()',
      table_name || '_immutable', table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
  end loop;
end
$immutability$;

revoke all on function public.reject_mobility_immutable_mutation() from public, anon, authenticated;

commit;
