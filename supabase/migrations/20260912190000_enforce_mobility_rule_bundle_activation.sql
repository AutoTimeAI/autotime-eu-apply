-- Closes the Slice B activation gap: until now nothing prevented inserting a
-- mobility_rule_bundle_versions row with state = 'active' regardless of
-- whether its critical claims were approved or an expert had signed off.
-- The existing mobility_rule_bundle_one_active_idx only guarantees at most
-- one active row per bundle; it never checked whether activation was earned.
--
-- mobility_rule_bundle_versions is insert-only (reject_mobility_immutable_mutation
-- blocks update/delete), so "activating" a bundle means inserting a new
-- successor version with state = 'active' whose predecessor_version_id points
-- at the version that accumulated the required claim links and sign-off —
-- never flipping an existing row's state.
--
-- KNOWN LIMITATION, not fixed here: evaluation_case_ids on a version records
-- which evaluation cases are required, but there is no table yet storing
-- pass/fail results for them, so this trigger cannot verify tests actually
-- passed — only that the bundle names at least one required case (already
-- enforced by mobility_rule_bundle_versions_cases_present) and that critical
-- claims/sign-off exist. A results table is a separate, larger addition.

begin;

do $preflight$
begin
  if to_regprocedure('public.enforce_mobility_rule_bundle_activation()') is not null then
    raise exception 'activation enforcement preflight failed: trigger function already exists';
  end if;
end
$preflight$;

create function public.enforce_mobility_rule_bundle_activation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  unapproved_critical_claims integer;
  critical_claim_count integer;
  valid_signoff_count integer;
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

  return new;
end;
$$;

create trigger mobility_rule_bundle_versions_enforce_activation
  before insert on public.mobility_rule_bundle_versions
  for each row execute function public.enforce_mobility_rule_bundle_activation();

revoke all on function public.enforce_mobility_rule_bundle_activation() from public, anon, authenticated;

commit;
