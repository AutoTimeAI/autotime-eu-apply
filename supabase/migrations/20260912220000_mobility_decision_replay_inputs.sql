-- Step 1 of the replay-worker foundation: a privacy-safe replay-input
-- envelope. mobility_decision_records (20260912130000) stores the final
-- canonical output and references a vacancy snapshot, employer
-- verification and rule bundle version - but not which candidate-evidence
-- versions or external-assessment snapshots actually fed that decision.
-- Without that, replaying a decision can only re-run current logic against
-- current data, which reproduces today's answer, not the historical one.
--
-- This table is deliberately reference-only: it stores which already-
-- immutable rows (candidate evidence versions, external assessment
-- snapshots) were the decision's inputs, plus a hash of the exact input
-- facts used, never a second copy of personal data.
--
-- KNOWN LIMITATION, not fixed here: the live decision path
-- (mobility-decision-writer.ts / decision-adapter.ts) does not yet track
-- which specific claim versions or candidate-evidence versions it
-- evaluated, because the decision logic itself is not yet claim-aware (see
-- the "executable, versioned rule format" step of the same investigation).
-- This table can be written today with empty reference arrays and
-- populated as that wiring lands, without a further migration.

begin;

do $preflight$
begin
  if to_regclass('public.mobility_decision_replay_inputs') is not null then
    raise exception 'decision replay inputs preflight failed: table already exists';
  end if;
end
$preflight$;

create table public.mobility_decision_replay_inputs (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null unique references public.mobility_decision_records(id) on delete cascade,
  candidate_evidence_version_ids uuid[] not null default '{}',
  external_assessment_snapshot_ids uuid[] not null default '{}',
  input_facts_sha256 text not null check (input_facts_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_at timestamptz not null default now()
);

create trigger mobility_decision_replay_inputs_no_update
  before update on public.mobility_decision_replay_inputs
  for each row execute function public.reject_mobility_version_update();

alter table public.mobility_decision_replay_inputs enable row level security;
revoke all on public.mobility_decision_replay_inputs from anon, authenticated;

commit;
