begin;

create table public.mobility_decision_correction_reviews (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.mobility_decision_corrections(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('triaged', 'accepted', 'rejected')),
  reason_codes text[] not null check (cardinality(reason_codes) > 0),
  resolution_notes text not null check (length(trim(resolution_notes)) >= 10),
  evidence_references jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_references) = 'array'),
  successor_decision_id uuid references public.mobility_decision_records(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  constraint mobility_correction_review_successor check (
    (decision = 'accepted' and successor_decision_id is not null and jsonb_array_length(evidence_references) > 0)
    or (decision <> 'accepted' and successor_decision_id is null)
  )
);
create trigger mobility_decision_correction_reviews_no_mutation before update or delete on public.mobility_decision_correction_reviews
  for each row execute function public.reject_mobility_immutable_mutation();
alter table public.mobility_decision_correction_reviews enable row level security;
revoke all on public.mobility_decision_correction_reviews from public, anon, authenticated;

alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended', 'beta_access_suspended',
  'beta_access_restored', 'feature_flag_updated', 'market_refresh_requested',
  'mobility_source_capture_reviewed', 'mobility_expert_signoff_recorded',
  'mobility_claim_reviewed', 'mobility_rule_bundle_activated',
  'mobility_rule_bundle_staged', 'mobility_rule_evaluation_recorded', 'mobility_fixture_set_registered',
  'mobility_correction_reviewed'
));
alter table public.admin_audit_events drop constraint admin_audit_events_target_type_check;
alter table public.admin_audit_events add constraint admin_audit_events_target_type_check check (target_type in (
  'admin_membership', 'beta_access', 'feature_flag', 'market_data', 'mobility_source',
  'mobility_claim', 'mobility_rule', 'mobility_correction'
));

create function public.admin_review_mobility_decision_correction(
  p_actor_user_id uuid, p_correction_id uuid, p_decision text, p_reason_codes text[],
  p_resolution_notes text, p_evidence_references jsonb, p_successor_decision_id uuid,
  p_reviewed_at timestamptz
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare correction public.mobility_decision_corrections%rowtype; successor public.mobility_decision_records%rowtype;
  review_id uuid; evidence_reference jsonb; evidence_id uuid;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then
    raise exception using errcode = '42501', message = 'active owner membership required';
  end if;
  select * into correction from public.mobility_decision_corrections where id = p_correction_id for update;
  if correction.id is null then raise exception using errcode = '22023', message = 'correction not found'; end if;
  if correction.state not in ('submitted', 'triaged') or p_decision not in ('triaged', 'accepted', 'rejected')
    or (correction.state = 'triaged' and p_decision = 'triaged') then
    raise exception using errcode = '22023', message = 'invalid correction review transition';
  end if;
  if cardinality(p_reason_codes) = 0 or length(trim(p_resolution_notes)) < 10
    or jsonb_typeof(p_evidence_references) <> 'array' then
    raise exception using errcode = '22023', message = 'review rationale and evidence array required';
  end if;
  if p_decision = 'accepted' then
    if p_successor_decision_id is null or jsonb_array_length(p_evidence_references) = 0 then
      raise exception using errcode = '22023', message = 'accepted correction requires evidence and successor decision';
    end if;
    select * into successor from public.mobility_decision_records where id = p_successor_decision_id;
    if successor.id is null or successor.user_id <> correction.user_id or successor.supersedes_decision_id <> correction.original_decision_id then
      raise exception using errcode = '22023', message = 'successor must belong to the same user and supersede the corrected decision';
    end if;
  elsif p_successor_decision_id is not null then
    raise exception using errcode = '22023', message = 'only accepted corrections may link a successor decision';
  end if;
  for evidence_reference in select value from jsonb_array_elements(p_evidence_references) loop
    begin evidence_id := (evidence_reference->>'id')::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'correction review evidence identifier must be a uuid';
    end;
    if (case evidence_reference->>'type'
      when 'source_version' then not exists (select 1 from public.mobility_source_versions where id = evidence_id)
      when 'candidate_evidence' then not exists (
        select 1 from public.mobility_candidate_evidence_versions version
        join public.mobility_candidate_evidence_items item on item.id = version.evidence_item_id
        where version.id = evidence_id and item.user_id = correction.user_id)
      when 'vacancy_snapshot' then not exists (select 1 from public.mobility_vacancy_snapshots where id = evidence_id and user_id = correction.user_id)
      when 'employer_verification' then not exists (select 1 from public.mobility_employer_verifications where id = evidence_id and user_id = correction.user_id)
      when 'decision' then not exists (select 1 from public.mobility_decision_records where id = evidence_id and user_id = correction.user_id)
      else true end) then
      raise exception using errcode = '22023', message = 'correction review evidence reference is invalid or inaccessible';
    end if;
  end loop;

  insert into public.mobility_decision_correction_reviews(
    correction_id, reviewer_id, decision, reason_codes, resolution_notes,
    evidence_references, successor_decision_id, reviewed_at
  ) values (
    p_correction_id, p_actor_user_id, p_decision, p_reason_codes, trim(p_resolution_notes),
    p_evidence_references, p_successor_decision_id, p_reviewed_at
  ) returning id into review_id;
  update public.mobility_decision_corrections set state = p_decision,
    successor_decision_id = p_successor_decision_id,
    resolved_at = case when p_decision in ('accepted', 'rejected') then p_reviewed_at else null end
    where id = p_correction_id;
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
    values (p_actor_user_id, 'mobility_correction_reviewed', 'mobility_correction', p_correction_id::text,
      jsonb_build_object('reviewId', review_id, 'decision', p_decision, 'reasonCodes', p_reason_codes,
        'successorDecisionId', p_successor_decision_id));
  return review_id;
end;
$$;
revoke all on function public.admin_review_mobility_decision_correction(uuid, uuid, text, text[], text, jsonb, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_review_mobility_decision_correction(uuid, uuid, text, text[], text, jsonb, uuid, timestamptz) to service_role;

alter table public.mobility_learning_events add constraint mobility_learning_events_correction_shape check (
  (event_type = 'correction_submitted' and correction_id is not null)
  or (event_type <> 'correction_submitted' and correction_id is null)
);
create function public.validate_mobility_correction_learning_lineage()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.event_type = 'correction_submitted' and not exists (
    select 1 from public.mobility_decision_corrections correction
    where correction.id = new.correction_id and correction.user_id = new.user_id
      and correction.original_decision_id = new.decision_id
  ) then
    raise exception 'learning correction does not belong to event owner and decision';
  end if;
  return new;
end;
$$;
create trigger mobility_learning_events_validate_correction before insert on public.mobility_learning_events
  for each row execute function public.validate_mobility_correction_learning_lineage();
revoke all on function public.validate_mobility_correction_learning_lineage() from public, anon, authenticated;

commit;
