-- Step 2 of the replay-worker foundation (see the replay-worker
-- investigation, 2026-09-12): external assessment responses (currently
-- Stamp4's live sponsorship-check service) are consumed once and discarded.
-- A decision made using a live external answer cannot be replayed later
-- against the same answer, because nothing recorded what that answer was.
--
-- This stores the already-redacted, schema-mapped assessment shape
-- (Stamp4SponsorshipAssessment, per packages/shared/src/international/stamp4-client.ts
-- - not the raw upstream response body, which may carry extra fields
-- AutoTime never asked for) plus enough metadata to know exactly what was
-- asked and when. request/response hashes allow detecting whether two
-- decisions actually saw the same external answer without re-storing
-- candidate-identifying request text twice.

begin;

do $preflight$
begin
  if to_regclass('public.mobility_external_assessment_snapshots') is not null then
    raise exception 'external assessment snapshots preflight failed: table already exists';
  end if;
end
$preflight$;

create table public.mobility_external_assessment_snapshots (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  endpoint text not null,
  request_sha256 text not null check (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_sha256 text not null check (response_sha256 ~ '^[a-f0-9]{64}$'),
  http_status integer not null check (http_status between 100 and 599),
  covered boolean not null,
  assessment jsonb,
  retrieved_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_external_assessment_snapshots_provider_present check (length(trim(provider)) > 0),
  constraint mobility_external_assessment_snapshots_endpoint_present check (length(trim(endpoint)) > 0),
  constraint mobility_external_assessment_snapshots_assessment_shape check (
    assessment is null or jsonb_typeof(assessment) = 'object'
  ),
  constraint mobility_external_assessment_snapshots_coverage_consistency check (
    covered or assessment is null
  )
);

create index mobility_external_assessment_snapshots_provider_time_idx
  on public.mobility_external_assessment_snapshots(provider, retrieved_at desc);

create trigger mobility_external_assessment_snapshots_immutable
  before update or delete on public.mobility_external_assessment_snapshots
  for each row execute function public.reject_mobility_immutable_mutation();

alter table public.mobility_external_assessment_snapshots enable row level security;
revoke all on public.mobility_external_assessment_snapshots from anon, authenticated;

commit;
