-- Materialise the exact governed claim/source lineage at decision-write time.
-- A decision names an immutable rule-bundle version. The bundle names its
-- versioned claims, and each claim names immutable source spans. Copying those
-- references into the decision ledger prevents later bundle evolution from
-- changing what the historical decision appears to have relied on.

begin;

do $preflight$
begin
  if to_regprocedure('public.attach_mobility_decision_evidence_lineage()') is not null then
    raise exception 'decision evidence lineage preflight failed: trigger function already exists';
  end if;
end
$preflight$;

create function public.attach_mobility_decision_evidence_lineage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  linked_count integer;
begin
  insert into public.mobility_decision_evidence_links (
    decision_id,
    claim_version_id,
    source_span_id,
    candidate_evidence_version_id,
    relation
  )
  select
    new.id,
    rule_claim.claim_version_id,
    claim_source.source_span_id,
    null,
    claim_source.relation
  from public.mobility_rule_claim_links as rule_claim
  join public.mobility_claim_source_spans as claim_source
    on claim_source.claim_version_id = rule_claim.claim_version_id
  where rule_claim.rule_bundle_version_id = new.rule_bundle_version_id
  on conflict do nothing;

  select count(*)
    into linked_count
  from public.mobility_decision_evidence_links
  where decision_id = new.id;

  if linked_count = 0 then
    raise exception using
      errcode = '23514',
      message = 'governed mobility decision requires claim-to-source evidence lineage';
  end if;

  return new;
end;
$$;

create trigger mobility_decision_records_attach_evidence_lineage
  after insert on public.mobility_decision_records
  for each row execute function public.attach_mobility_decision_evidence_lineage();

revoke all on function public.attach_mobility_decision_evidence_lineage() from public, anon, authenticated;

commit;
