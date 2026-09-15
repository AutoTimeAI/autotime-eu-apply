begin;

alter table public.mobility_expert_signoffs
  add column recorded_by uuid references auth.users(id) on delete restrict;

alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended',
  'beta_access_suspended', 'beta_access_restored', 'feature_flag_updated',
  'market_refresh_requested', 'mobility_source_capture_reviewed', 'mobility_expert_signoff_recorded'
));

create function public.admin_record_mobility_expert_signoff(
  p_actor_user_id uuid, p_rule_bundle_version_id uuid,
  p_reviewer_name text, p_reviewer_role text, p_qualification_basis text,
  p_scope_reviewed text, p_permitted_output_language text,
  p_prohibited_output_language text, p_conditions_and_exclusions text,
  p_test_run_id text, p_decision text, p_effective_from timestamptz,
  p_review_by timestamptz, p_signed_at timestamptz, p_signature_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  missing_claims integer;
  missing_captures integer;
  missing_cases integer;
  snapshot_ids uuid[];
  signoff_id uuid;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then
    raise exception using errcode = '42501', message = 'active owner membership required';
  end if;
  if p_decision not in ('approved', 'approved_with_conditions', 'rejected') or p_review_by <= p_effective_from then
    raise exception using errcode = '22023', message = 'invalid expert sign-off decision or review window';
  end if;

  select count(*) into missing_claims
  from public.mobility_rule_claim_links link
  join public.mobility_claim_versions claim on claim.id = link.claim_version_id
  where link.rule_bundle_version_id = p_rule_bundle_version_id and link.critical and claim.state <> 'approved';
  if missing_claims > 0 then raise exception 'expert sign-off blocked: % critical claims are not approved', missing_claims; end if;

  select array_agg(distinct source_version.id), count(*) filter (where review.id is null)
    into snapshot_ids, missing_captures
  from public.mobility_rule_claim_links link
  join public.mobility_claim_source_spans claim_source on claim_source.claim_version_id = link.claim_version_id
  join public.mobility_source_spans source_span on source_span.id = claim_source.source_span_id
  join public.mobility_source_versions source_version on source_version.id = source_span.source_version_id
  left join public.mobility_source_change_events change_event on change_event.observed_version_id = source_version.id
  left join public.mobility_source_capture_reviews review on review.source_change_event_id = change_event.id and review.decision = 'accepted_for_claim_review'
  where link.rule_bundle_version_id = p_rule_bundle_version_id and link.critical;
  if coalesce(cardinality(snapshot_ids), 0) = 0 or missing_captures > 0 then
    raise exception 'expert sign-off blocked: critical source captures are missing acceptance';
  end if;

  select count(*) into missing_cases
  from public.mobility_rule_bundle_versions bundle,
       unnest(bundle.evaluation_case_ids) required(case_id)
  where bundle.id = p_rule_bundle_version_id and not exists (
    select 1 from public.mobility_rule_bundle_evaluation_results result
    where result.rule_bundle_version_id = bundle.id and result.case_id = required.case_id
      and result.run_id = p_test_run_id and result.passed
  );
  if missing_cases > 0 then raise exception 'expert sign-off blocked: % required cases did not pass in the named run', missing_cases; end if;

  insert into public.mobility_expert_signoffs (
    rule_bundle_version_id, reviewer_name, reviewer_role, qualification_basis,
    scope_reviewed, permitted_output_language, prohibited_output_language,
    conditions_and_exclusions, evidence_snapshot_ids, test_run_id, decision,
    effective_from, review_by, signed_at, signature_reference, recorded_by
  ) values (
    p_rule_bundle_version_id, p_reviewer_name, p_reviewer_role, p_qualification_basis,
    p_scope_reviewed, p_permitted_output_language, p_prohibited_output_language,
    p_conditions_and_exclusions, snapshot_ids, p_test_run_id, p_decision,
    p_effective_from, p_review_by, p_signed_at, p_signature_reference, p_actor_user_id
  ) returning id into signoff_id;

  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
  values (p_actor_user_id, 'mobility_expert_signoff_recorded', 'mobility_source', signoff_id::text,
    jsonb_build_object('decision', p_decision, 'scope', 'expert_signoff'));
  return signoff_id;
end;
$$;

revoke all on function public.admin_record_mobility_expert_signoff(uuid, uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz, text) from public, anon, authenticated;
grant execute on function public.admin_record_mobility_expert_signoff(uuid, uuid, text, text, text, text, text, text, text, text, text, timestamptz, timestamptz, timestamptz, text) to service_role;

commit;
