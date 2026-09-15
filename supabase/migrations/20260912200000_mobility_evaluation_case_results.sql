-- Closes the remaining Slice B gap flagged in
-- 20260912190000_enforce_mobility_rule_bundle_activation.sql: that
-- migration could confirm a rule bundle named required evaluation cases
-- (evaluation_case_ids), but nothing stored whether those cases actually
-- passed. This migration adds that results ledger and extends the
-- activation trigger to require a passing result for every case the
-- predecessor version declared required.
--
-- Case identifiers (e.g. 'DE-BOUNDARY-001', 'NL-SPONSOR-002') come from the
-- desk-research evaluation catalogue at
-- docs/reports/evidence-deep-rd-2026-09/evaluation-case-catalogue.csv. This
-- table does not duplicate that catalogue's content (input_condition,
-- expected_state text, etc.) — it only records the pass/fail outcome of
-- running a specific rule_bundle_version against a specific case_id.

begin;

do $preflight$
begin
  if to_regclass('public.mobility_rule_bundle_evaluation_results') is not null then
    raise exception 'evaluation results preflight failed: table already exists';
  end if;
end
$preflight$;

create table public.mobility_rule_bundle_evaluation_results (
  id uuid primary key default gen_random_uuid(),
  rule_bundle_version_id uuid not null references public.mobility_rule_bundle_versions(id),
  case_id text not null,
  passed boolean not null,
  actual_state text not null,
  run_id text not null,
  evaluator text not null,
  details jsonb not null default '{}'::jsonb,
  evaluated_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  constraint mobility_rule_bundle_evaluation_results_case_present check (length(trim(case_id)) > 0),
  constraint mobility_rule_bundle_evaluation_results_actual_state_present check (length(trim(actual_state)) > 0),
  constraint mobility_rule_bundle_evaluation_results_run_id_present check (length(trim(run_id)) > 0),
  constraint mobility_rule_bundle_evaluation_results_evaluator_present check (length(trim(evaluator)) > 0),
  constraint mobility_rule_bundle_evaluation_results_details_object check (jsonb_typeof(details) = 'object'),
  unique (rule_bundle_version_id, case_id, run_id)
);

create index mobility_rule_bundle_evaluation_results_version_case_idx
  on public.mobility_rule_bundle_evaluation_results(rule_bundle_version_id, case_id, evaluated_at desc);

create trigger mobility_rule_bundle_evaluation_results_immutable
  before update or delete on public.mobility_rule_bundle_evaluation_results
  for each row execute function public.reject_mobility_immutable_mutation();

alter table public.mobility_rule_bundle_evaluation_results enable row level security;
revoke all on public.mobility_rule_bundle_evaluation_results from anon, authenticated;

-- Extend activation enforcement: every case_id the predecessor version
-- declared in evaluation_case_ids must have at least one passing result
-- recorded against that exact predecessor_version_id. A case passing
-- against a different (e.g. earlier) version does not count, since rule
-- content may have changed.
create or replace function public.enforce_mobility_rule_bundle_activation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  unapproved_critical_claims integer;
  critical_claim_count integer;
  valid_signoff_count integer;
  required_case_ids text[];
  missing_case_count integer;
begin
  if new.state <> 'active' then
    return new;
  end if;

  if new.version = 1 or new.predecessor_version_id is null then
    raise exception 'a bundle cannot activate as its first version; it must first accumulate reviewed claims and sign-off on a predecessor version';
  end if;

  select count(*) into critical_claim_count
  from public.mobility_rule_claim_links l
  where l.rule_bundle_version_id = new.predecessor_version_id
    and l.critical;

  if critical_claim_count = 0 then
    raise exception 'a bundle cannot activate with no critical claims linked to its predecessor version';
  end if;

  select count(*) into unapproved_critical_claims
  from public.mobility_rule_claim_links l
  join public.mobility_claim_versions cv on cv.id = l.claim_version_id
  where l.rule_bundle_version_id = new.predecessor_version_id
    and l.critical
    and cv.state <> 'approved';

  if unapproved_critical_claims > 0 then
    raise exception 'a bundle cannot activate while % of its critical claims are not in the approved state', unapproved_critical_claims;
  end if;

  select count(*) into valid_signoff_count
  from public.mobility_expert_signoffs s
  where s.rule_bundle_version_id = new.predecessor_version_id
    and s.decision in ('approved', 'approved_with_conditions')
    and s.review_by > now();

  if valid_signoff_count = 0 then
    raise exception 'a bundle cannot activate without an unexpired expert sign-off approving its predecessor version';
  end if;

  select rbv.evaluation_case_ids into required_case_ids
  from public.mobility_rule_bundle_versions rbv
  where rbv.id = new.predecessor_version_id;

  select count(*) into missing_case_count
  from unnest(required_case_ids) as required(case_id)
  where not exists (
    select 1 from public.mobility_rule_bundle_evaluation_results r
    where r.rule_bundle_version_id = new.predecessor_version_id
      and r.case_id = required.case_id
      and r.passed
  );

  if missing_case_count > 0 then
    raise exception 'a bundle cannot activate while % of its required evaluation cases have no passing result recorded against the predecessor version', missing_case_count;
  end if;

  return new;
end;
$$;

commit;
