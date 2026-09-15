begin;

drop index public.mobility_rule_bundle_one_active_idx;
create table public.mobility_rule_bundle_current (
  bundle_id text primary key references public.mobility_rule_bundles(id),
  rule_bundle_version_id uuid not null unique references public.mobility_rule_bundle_versions(id),
  activation_id uuid not null unique references public.mobility_rule_bundle_activations(id),
  activated_at timestamptz not null, activated_by uuid not null references auth.users(id) on delete restrict
);
alter table public.mobility_rule_bundle_current enable row level security;
revoke all on public.mobility_rule_bundle_current from public, anon, authenticated;

alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended', 'beta_access_suspended',
  'beta_access_restored', 'feature_flag_updated', 'market_refresh_requested',
  'mobility_source_capture_reviewed', 'mobility_expert_signoff_recorded',
  'mobility_claim_reviewed', 'mobility_rule_bundle_activated'
));
alter table public.admin_audit_events drop constraint admin_audit_events_target_type_check;
alter table public.admin_audit_events add constraint admin_audit_events_target_type_check check (target_type in (
  'admin_membership', 'beta_access', 'feature_flag', 'market_data', 'mobility_source',
  'mobility_claim', 'mobility_rule'
));

create function public.admin_activate_mobility_rule_bundle(
  p_actor_user_id uuid, p_reviewed_version_id uuid, p_country_code text,
  p_reason text, p_activated_at timestamptz
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  reviewed public.mobility_rule_bundle_versions%rowtype;
  activated_version_id uuid;
  activation_event_id uuid;
  signoff public.mobility_expert_signoffs%rowtype;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then
    raise exception using errcode = '42501', message = 'active owner membership required';
  end if;
  if p_country_code !~ '^[A-Z]{2}$' or length(trim(p_reason)) < 10 then
    raise exception using errcode = '22023', message = 'country code and substantive activation reason required';
  end if;
  select * into reviewed from public.mobility_rule_bundle_versions where id = p_reviewed_version_id;
  if reviewed.id is null or reviewed.state not in ('review_required', 'approved') then
    raise exception using errcode = '22023', message = 'reviewed predecessor version required';
  end if;
  select * into signoff from public.mobility_expert_signoffs
  where rule_bundle_version_id = reviewed.id and decision in ('approved', 'approved_with_conditions')
    and effective_from <= p_activated_at and review_by > p_activated_at
  order by signed_at desc limit 1;
  if signoff.id is null then raise exception 'activation requires a currently effective expert sign-off'; end if;

  insert into public.mobility_rule_bundle_versions (
    bundle_id, version, state, rules, evaluation_case_ids,
    effective_from, effective_to, predecessor_version_id
  ) values (
    reviewed.bundle_id, reviewed.version + 1, 'active', reviewed.rules,
    reviewed.evaluation_case_ids, p_activated_at, reviewed.effective_to, reviewed.id
  ) returning id into activated_version_id;
  insert into public.mobility_rule_claim_links(rule_bundle_version_id, claim_version_id, critical)
    select activated_version_id, claim_version_id, critical from public.mobility_rule_claim_links
    where rule_bundle_version_id = reviewed.id;
  insert into public.mobility_rule_bundle_activations(rule_bundle_version_id, action, reason, actor_id, occurred_at)
    values (activated_version_id, 'activate', p_reason, p_actor_user_id, p_activated_at)
    returning id into activation_event_id;
  insert into public.mobility_rule_bundle_current(bundle_id, rule_bundle_version_id, activation_id, activated_at, activated_by)
    values (reviewed.bundle_id, activated_version_id, activation_event_id, p_activated_at, p_actor_user_id)
    on conflict (bundle_id) do update set rule_bundle_version_id = excluded.rule_bundle_version_id,
      activation_id = excluded.activation_id, activated_at = excluded.activated_at, activated_by = excluded.activated_by;

  insert into public.mobility_country_readiness_snapshots (
    country_code, rule_bundle_version_id, expert_signoff_id, state, score,
    output_permission, reason_codes, input_facts, evaluated_at
  ) values (
    p_country_code, activated_version_id, signoff.id,
    case when signoff.decision = 'approved' then 'approved' else 'conditional' end,
    case when signoff.decision = 'approved' then 100 else 85 end,
    case when signoff.decision = 'approved' then 'definitive' else 'conditional' end,
    case when signoff.decision = 'approved' then '{}'::text[] else array['EXPERT_SIGNOFF_CONDITIONS_APPLY'] end,
    jsonb_build_object('activationId', activation_event_id, 'reviewedVersionId', reviewed.id, 'expertSignoffId', signoff.id), p_activated_at
  );
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
    values (p_actor_user_id, 'mobility_rule_bundle_activated', 'mobility_rule', activated_version_id::text,
      jsonb_build_object('previousVersion', reviewed.version, 'version', reviewed.version + 1));
  return activated_version_id;
end;
$$;
revoke all on function public.admin_activate_mobility_rule_bundle(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_activate_mobility_rule_bundle(uuid, uuid, text, text, timestamptz) to service_role;

commit;
