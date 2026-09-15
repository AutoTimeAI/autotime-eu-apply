begin;
create table public.mobility_evaluation_fixture_sets (
  id uuid primary key default gen_random_uuid(), jurisdiction text not null,
  version integer not null check (version > 0), fixtures jsonb not null check (jsonb_typeof(fixtures) = 'array' and jsonb_array_length(fixtures) > 0),
  fixtures_sha256 text not null check (fixtures_sha256 ~ '^[a-f0-9]{64}$'),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(), unique(jurisdiction, version)
);
create trigger mobility_evaluation_fixture_sets_no_mutation before update or delete on public.mobility_evaluation_fixture_sets
  for each row execute function public.reject_mobility_immutable_mutation();
alter table public.mobility_evaluation_fixture_sets enable row level security;
revoke all on public.mobility_evaluation_fixture_sets from public, anon, authenticated;
alter table public.mobility_rule_bundle_evaluation_results add column fixture_set_id uuid references public.mobility_evaluation_fixture_sets(id);
alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended', 'beta_access_suspended',
  'beta_access_restored', 'feature_flag_updated', 'market_refresh_requested',
  'mobility_source_capture_reviewed', 'mobility_expert_signoff_recorded',
  'mobility_claim_reviewed', 'mobility_rule_bundle_activated',
  'mobility_rule_bundle_staged', 'mobility_rule_evaluation_recorded', 'mobility_fixture_set_registered'
));
create function public.admin_register_mobility_fixture_set(p_actor_user_id uuid, p_jurisdiction text, p_version integer, p_fixtures jsonb, p_fixtures_sha256 text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare fixture_id uuid;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then raise exception using errcode = '42501', message = 'active owner membership required'; end if;
  insert into public.mobility_evaluation_fixture_sets(jurisdiction, version, fixtures, fixtures_sha256, recorded_by)
    values (p_jurisdiction, p_version, p_fixtures, p_fixtures_sha256, p_actor_user_id) returning id into fixture_id;
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
    values (p_actor_user_id, 'mobility_fixture_set_registered', 'mobility_rule', fixture_id::text, jsonb_build_object('version', p_version));
  return fixture_id;
end; $$;
revoke all on function public.admin_register_mobility_fixture_set(uuid, text, integer, jsonb, text) from public, anon, authenticated;
grant execute on function public.admin_register_mobility_fixture_set(uuid, text, integer, jsonb, text) to service_role;
create function public.admin_record_mobility_rule_evaluation(
  p_actor_user_id uuid, p_rule_bundle_version_id uuid, p_fixture_set_id uuid, p_run_id text,
  p_results jsonb, p_evaluated_at timestamptz
)
returns integer language plpgsql security definer set search_path = '' as $$
declare missing_count integer; extra_count integer; duplicate_count integer; mismatch_count integer; inserted_count integer; stored_fixtures jsonb; fixture_hash text;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then
    raise exception using errcode = '42501', message = 'active owner membership required';
  end if;
  if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) = 0 or length(trim(p_run_id)) < 3 then
    raise exception using errcode = '22023', message = 'complete evaluation results and run id required';
  end if;
  select fixtures, fixtures_sha256 into stored_fixtures, fixture_hash from public.mobility_evaluation_fixture_sets where id = p_fixture_set_id;
  if stored_fixtures is null then raise exception using errcode = '22023', message = 'immutable evaluation fixture set required'; end if;
  with supplied as (select value->>'caseId' case_id from jsonb_array_elements(p_results))
  select count(*) into duplicate_count from (select case_id from supplied group by case_id having count(*) > 1) duplicates;
  select count(*) into missing_count from public.mobility_rule_bundle_versions bundle,
    unnest(bundle.evaluation_case_ids) required(case_id)
    where bundle.id = p_rule_bundle_version_id and not exists (
      select 1 from jsonb_array_elements(p_results) supplied where supplied->>'caseId' = required.case_id);
  select count(*) into extra_count from jsonb_array_elements(p_results) supplied
    where not exists (select 1 from public.mobility_rule_bundle_versions bundle
      where bundle.id = p_rule_bundle_version_id and supplied->>'caseId' = any(bundle.evaluation_case_ids));
  select count(*) into mismatch_count from jsonb_array_elements(p_results) result
    where not exists (select 1 from jsonb_array_elements(stored_fixtures) fixture
      where fixture->>'caseId' = result->>'caseId' and fixture->>'expectedState' = result->>'expectedState');
  if missing_count > 0 or extra_count > 0 or duplicate_count > 0 or mismatch_count > 0 then
    raise exception 'evaluation run must contain each required case exactly once';
  end if;
  insert into public.mobility_rule_bundle_evaluation_results(
    rule_bundle_version_id, fixture_set_id, case_id, passed, actual_state, run_id, evaluator, details, evaluated_at
  ) select p_rule_bundle_version_id, p_fixture_set_id, value->>'caseId', (value->>'passed')::boolean,
    value->>'actualState', p_run_id, 'autotime-rule-dsl-v1',
    jsonb_build_object('expectedState', value->>'expectedState', 'matchedRuleId', value->>'matchedRuleId', 'fixtureSetSha256', fixture_hash), p_evaluated_at
    from jsonb_array_elements(p_results);
  get diagnostics inserted_count = row_count;
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
    values (p_actor_user_id, 'mobility_rule_evaluation_recorded', 'mobility_rule', p_rule_bundle_version_id::text,
      jsonb_build_object('runId', p_run_id, 'resultCount', inserted_count));
  return inserted_count;
end;
$$;
revoke all on function public.admin_record_mobility_rule_evaluation(uuid, uuid, uuid, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_record_mobility_rule_evaluation(uuid, uuid, uuid, text, jsonb, timestamptz) to service_role;
commit;
