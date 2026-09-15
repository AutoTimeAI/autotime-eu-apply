-- One atomic write boundary for the complete governed decision receipt.

begin;

alter table public.mobility_employer_verifications
  drop constraint mobility_employer_verifications_state_check;
alter table public.mobility_employer_verifications
  add constraint mobility_employer_verifications_state_check
  check (state in ('verified', 'ambiguous', 'not_found', 'stale', 'not_checked', 'not_applicable'));
alter table public.mobility_employer_verifications alter column checked_at drop not null;
alter table public.mobility_employer_verifications
  add constraint mobility_employer_verifications_check_time
  check ((state = 'not_checked' and checked_at is null) or (state <> 'not_checked' and checked_at is not null));

alter table public.mobility_decision_records
  drop constraint mobility_decision_records_employer_state_check;
alter table public.mobility_decision_records
  add constraint mobility_decision_records_employer_state_check
  check (employer_state in ('verified', 'ambiguous', 'not_found', 'stale', 'not_checked', 'not_applicable'));

create function public.append_atomic_mobility_decision_receipt(
  p_user_id uuid,
  p_candidate_facts jsonb,
  p_vacancy jsonb,
  p_decision jsonb,
  p_external_assessment_snapshot_ids uuid[],
  p_recorded_at timestamptz
)
returns table (vacancy_snapshot_id uuid, decision_record_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  fact jsonb;
  evidence_item_id uuid;
  evidence_version_id uuid;
  candidate_version_ids uuid[] := '{}';
  created_vacancy_id uuid;
  created_employer_verification_id uuid;
  created_decision_id uuid;
  current_register_version_id uuid;
  matched_register_row_id uuid;
  employer_match_count integer := 0;
  resolved_employer_state text := 'not_checked';
  resolved_match_method text := 'none';
  employer_reason_codes text[] := array['EMPLOYER_VERIFICATION_NOT_RUN'];
  employer_checked_at timestamptz;
begin
  if jsonb_typeof(p_candidate_facts) <> 'array' or jsonb_array_length(p_candidate_facts) = 0 then
    raise exception using errcode = '22023', message = 'candidate decision facts are required';
  end if;

  for fact in select value from jsonb_array_elements(p_candidate_facts)
  loop
    insert into public.mobility_candidate_evidence_items (user_id, subject, sensitivity)
    values (p_user_id, fact->>'subject', fact->>'sensitivity')
    returning id into evidence_item_id;

    insert into public.mobility_candidate_evidence_versions (
      evidence_item_id, version, status, source_kind, source_label,
      value_sha256, encrypted_payload_reference, confirmed_at,
      expires_at, predecessor_version_id
    ) values (
      evidence_item_id, 1, 'user_declared', fact->>'sourceKind',
      fact->>'sourceLabel', fact->>'valueSha256', null, p_recorded_at,
      null, null
    ) returning id into evidence_version_id;

    candidate_version_ids := array_append(candidate_version_ids, evidence_version_id);
  end loop;

  insert into public.mobility_vacancy_snapshots (
    user_id, application_reference, source_url, employing_entity_claim,
    title, country, content_sha256, encrypted_payload_reference, captured_at
  ) values (
    p_user_id, null, nullif(p_vacancy->>'sourceUrl', ''),
    nullif(p_vacancy->>'employingEntityClaim', ''), p_vacancy->>'title',
    p_vacancy->>'country', p_vacancy->>'contentSha256', null, p_recorded_at
  ) returning id into created_vacancy_id;

  if p_decision->>'employerState' <> 'not_applicable' then
    select register_version.id
      into current_register_version_id
    from public.mobility_employer_registers as register
    join public.mobility_employer_register_versions as register_version
      on register_version.register_id = register.id
    where lower(register.jurisdiction) = lower(p_vacancy->>'country')
      and register_version.status = 'current'
      and (register_version.effective_from is null or register_version.effective_from <= p_recorded_at)
      and (register_version.effective_to is null or register_version.effective_to > p_recorded_at)
    order by register_version.version desc
    limit 1;

    if current_register_version_id is not null
       and nullif(trim(p_vacancy->>'employingEntityClaim'), '') is not null then
      select count(*), (array_agg(register_row.id order by register_row.id))[1]
        into employer_match_count, matched_register_row_id
      from public.mobility_employer_register_rows as register_row
      where register_row.register_version_id = current_register_version_id
        and lower(regexp_replace(trim(register_row.legal_name), '\s+', ' ', 'g')) =
            lower(regexp_replace(trim(p_vacancy->>'employingEntityClaim'), '\s+', ' ', 'g'))
        and (register_row.valid_from is null or register_row.valid_from <= p_recorded_at)
        and (register_row.valid_to is null or register_row.valid_to > p_recorded_at);

      employer_checked_at := p_recorded_at;
      if employer_match_count = 1 then
        resolved_employer_state := 'verified';
        resolved_match_method := 'exact_legal_name';
        employer_reason_codes := array['EXACT_LEGAL_NAME_REGISTER_MATCH'];
      elsif employer_match_count > 1 then
        resolved_employer_state := 'ambiguous';
        matched_register_row_id := null;
        employer_reason_codes := array['MULTIPLE_EXACT_LEGAL_NAME_MATCHES'];
      else
        resolved_employer_state := 'not_found';
        employer_reason_codes := array['NO_EXACT_LEGAL_NAME_REGISTER_MATCH'];
      end if;
    elsif current_register_version_id is null then
      employer_reason_codes := array['CURRENT_SPONSOR_REGISTER_NOT_AVAILABLE'];
    else
      employer_reason_codes := array['EMPLOYING_LEGAL_ENTITY_NOT_SUPPLIED'];
    end if;

    insert into public.mobility_employer_verifications (
      user_id, vacancy_snapshot_id, register_version_id, register_row_id,
      claimed_name, claimed_identifier, state, match_method, reason_codes,
      checked_at
    ) values (
      p_user_id, created_vacancy_id, current_register_version_id, matched_register_row_id,
      coalesce(nullif(p_vacancy->>'employingEntityClaim', ''), 'Employing entity not supplied'),
      null, resolved_employer_state, resolved_match_method, employer_reason_codes,
      employer_checked_at
    ) returning id into created_employer_verification_id;
  end if;

  insert into public.mobility_decision_records (
    user_id, vacancy_snapshot_id, employer_verification_id,
    rule_bundle_version_id, mobility_state, employer_state,
    output_permission, reason_codes, canonical_output,
    canonical_output_sha256
  ) values (
    p_user_id, created_vacancy_id, created_employer_verification_id,
    (p_decision->>'ruleBundleVersionId')::uuid,
    case
      when current_register_version_id is not null and resolved_employer_state <> 'verified'
        then 'employer_unverified'
      else p_decision->>'mobilityState'
    end,
    resolved_employer_state, p_decision->>'outputPermission',
    array(select jsonb_array_elements_text(p_decision->'reasonCodes')),
    p_decision->'canonicalOutput', p_decision->>'canonicalOutputSha256'
  ) returning id into created_decision_id;

  insert into public.mobility_decision_replay_inputs (
    decision_id, candidate_evidence_version_ids,
    external_assessment_snapshot_ids, input_facts_sha256
  ) values (
    created_decision_id, candidate_version_ids,
    coalesce(p_external_assessment_snapshot_ids, '{}'),
    encode(extensions.digest(convert_to(jsonb_build_object(
      'candidateEvidenceVersionIds', candidate_version_ids,
      'externalAssessmentSnapshotIds', coalesce(p_external_assessment_snapshot_ids, '{}'),
      'ruleBundleVersionId', p_decision->>'ruleBundleVersionId',
      'targetCountry', p_decision->>'targetCountry'
    )::text, 'UTF8'), 'sha256'), 'hex')
  );

  return query select created_vacancy_id, created_decision_id;
end;
$$;

revoke all on function public.append_atomic_mobility_decision_receipt(uuid, jsonb, jsonb, jsonb, uuid[], timestamptz) from public, anon, authenticated;
grant execute on function public.append_atomic_mobility_decision_receipt(uuid, jsonb, jsonb, jsonb, uuid[], timestamptz) to service_role;

commit;
