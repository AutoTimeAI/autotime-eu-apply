begin;

alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended', 'beta_access_suspended',
  'beta_access_restored', 'feature_flag_updated', 'market_refresh_requested',
  'mobility_source_capture_reviewed', 'mobility_expert_signoff_recorded',
  'mobility_claim_reviewed', 'mobility_rule_bundle_activated', 'mobility_rule_bundle_staged'
));

create function public.admin_stage_mobility_rule_bundle(
  p_actor_user_id uuid, p_predecessor_version_id uuid,
  p_approved_claim_version_ids uuid[], p_rules jsonb,
  p_evaluation_case_ids text[], p_effective_from timestamptz,
  p_reason text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  predecessor public.mobility_rule_bundle_versions%rowtype;
  missing_claim_count integer;
  extra_claim_count integer;
  unapproved_claim_count integer;
  duplicate_semantic_claim_count integer;
  staged_version_id uuid;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then
    raise exception using errcode = '42501', message = 'active owner membership required';
  end if;
  if jsonb_typeof(p_rules) <> 'object' or p_rules = '{}'::jsonb or cardinality(p_approved_claim_version_ids) = 0 or cardinality(p_evaluation_case_ids) = 0 or length(trim(p_reason)) < 10 then
    raise exception using errcode = '22023', message = 'rules, evaluation cases, and substantive staging reason required';
  end if;
  select * into predecessor from public.mobility_rule_bundle_versions where id = p_predecessor_version_id;
  if predecessor.id is null then raise exception using errcode = '22023', message = 'predecessor bundle version not found'; end if;

  select count(*) into missing_claim_count
  from (select distinct claim.claim_id from public.mobility_rule_claim_links link
    join public.mobility_claim_versions claim on claim.id = link.claim_version_id
    where link.rule_bundle_version_id = predecessor.id and link.critical) required
  where not exists (select 1 from public.mobility_claim_versions selected
    where selected.id = any(p_approved_claim_version_ids) and selected.claim_id = required.claim_id);
  select count(*) into extra_claim_count from public.mobility_claim_versions selected
  where selected.id = any(p_approved_claim_version_ids) and not exists (
    select 1 from public.mobility_rule_claim_links link
    join public.mobility_claim_versions prior_claim on prior_claim.id = link.claim_version_id
    where link.rule_bundle_version_id = predecessor.id and link.critical and prior_claim.claim_id = selected.claim_id);
  select count(*) into unapproved_claim_count from public.mobility_claim_versions
    where id = any(p_approved_claim_version_ids) and state <> 'approved';
  select count(*) into duplicate_semantic_claim_count from (
    select claim_id from public.mobility_claim_versions where id = any(p_approved_claim_version_ids)
    group by claim_id having count(*) > 1
  ) duplicates;
  if missing_claim_count > 0 or extra_claim_count > 0 or unapproved_claim_count > 0 or duplicate_semantic_claim_count > 0 then
    raise exception 'staging requires exactly one approved successor for every critical semantic claim';
  end if;

  insert into public.mobility_rule_bundle_versions (
    bundle_id, version, state, rules, evaluation_case_ids,
    effective_from, effective_to, predecessor_version_id
  ) values (
    predecessor.bundle_id, predecessor.version + 1, 'review_required', p_rules,
    p_evaluation_case_ids, p_effective_from, null, predecessor.id
  ) returning id into staged_version_id;
  insert into public.mobility_rule_claim_links(rule_bundle_version_id, claim_version_id, critical)
    select staged_version_id, selected.claim_version_id, true
    from unnest(p_approved_claim_version_ids) as selected(claim_version_id);
  insert into public.mobility_rule_bundle_activations(rule_bundle_version_id, action, reason, actor_id, occurred_at)
    values (staged_version_id, 'supersede', p_reason, p_actor_user_id, p_effective_from);
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
    values (p_actor_user_id, 'mobility_rule_bundle_staged', 'mobility_rule', staged_version_id::text,
      jsonb_build_object('previousVersion', predecessor.version, 'version', predecessor.version + 1));
  return staged_version_id;
end;
$$;
revoke all on function public.admin_stage_mobility_rule_bundle(uuid, uuid, uuid[], jsonb, text[], timestamptz, text) from public, anon, authenticated;
grant execute on function public.admin_stage_mobility_rule_bundle(uuid, uuid, uuid[], jsonb, text[], timestamptz, text) to service_role;

commit;
