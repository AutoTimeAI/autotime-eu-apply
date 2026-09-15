begin;

create table public.mobility_claim_reviews (
  id uuid primary key default gen_random_uuid(),
  predecessor_claim_version_id uuid not null unique references public.mobility_claim_versions(id),
  approved_claim_version_id uuid not null unique references public.mobility_claim_versions(id),
  reviewer_name text not null, reviewer_role text not null,
  qualification_basis text not null, scope_reviewed text not null,
  signature_reference text not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null
);
create trigger mobility_claim_reviews_no_mutation before update or delete on public.mobility_claim_reviews
  for each row execute function public.reject_mobility_immutable_mutation();
alter table public.mobility_claim_reviews enable row level security;
revoke all on public.mobility_claim_reviews from public, anon, authenticated;

alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended', 'beta_access_suspended',
  'beta_access_restored', 'feature_flag_updated', 'market_refresh_requested',
  'mobility_source_capture_reviewed', 'mobility_expert_signoff_recorded', 'mobility_claim_reviewed'
));
alter table public.admin_audit_events drop constraint admin_audit_events_target_type_check;
alter table public.admin_audit_events add constraint admin_audit_events_target_type_check check (target_type in (
  'admin_membership', 'beta_access', 'feature_flag', 'market_data', 'mobility_source', 'mobility_claim'
));

create function public.admin_approve_mobility_claim_successor(
  p_actor_user_id uuid, p_predecessor_claim_version_id uuid,
  p_statement text, p_claim_type text, p_confidence text,
  p_source_span_ids uuid[], p_reviewer_name text, p_reviewer_role text,
  p_qualification_basis text, p_scope_reviewed text,
  p_signature_reference text, p_reviewed_at timestamptz
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  prior public.mobility_claim_versions%rowtype;
  invalid_span_count integer;
  successor_id uuid;
  span_id uuid;
begin
  if not exists (select 1 from public.admin_memberships where user_id = p_actor_user_id and status = 'active' and role = 'owner') then
    raise exception using errcode = '42501', message = 'active owner membership required';
  end if;
  select * into prior from public.mobility_claim_versions where id = p_predecessor_claim_version_id;
  if prior.id is null or prior.state not in ('draft', 'review_required', 'approved') then
    raise exception using errcode = '22023', message = 'claim predecessor is not reviewable';
  end if;
  if cardinality(p_source_span_ids) = 0 then raise exception using errcode = '22023', message = 'approved claim requires source spans'; end if;

  select count(*) into invalid_span_count from unnest(p_source_span_ids) requested(span_id)
  where not exists (
    select 1 from public.mobility_source_spans span
    join public.mobility_source_change_events event on event.observed_version_id = span.source_version_id
    join public.mobility_source_capture_reviews review on review.source_change_event_id = event.id
    where span.id = requested.span_id and review.decision = 'accepted_for_claim_review'
  );
  if invalid_span_count > 0 then raise exception 'claim approval blocked: % source spans lack accepted captures', invalid_span_count; end if;

  insert into public.mobility_claim_versions (
    claim_id, version, statement, claim_type, confidence, state,
    effective_from, effective_to, predecessor_version_id
  ) values (
    prior.claim_id, prior.version + 1, p_statement, p_claim_type, p_confidence,
    'approved', prior.effective_from, prior.effective_to, prior.id
  ) returning id into successor_id;
  foreach span_id in array p_source_span_ids loop
    insert into public.mobility_claim_source_spans(claim_version_id, source_span_id, relation)
    values (successor_id, span_id, 'supports');
  end loop;
  insert into public.mobility_claim_reviews (
    predecessor_claim_version_id, approved_claim_version_id, reviewer_name,
    reviewer_role, qualification_basis, scope_reviewed, signature_reference,
    recorded_by, reviewed_at
  ) values (
    prior.id, successor_id, p_reviewer_name, p_reviewer_role,
    p_qualification_basis, p_scope_reviewed, p_signature_reference,
    p_actor_user_id, p_reviewed_at
  );
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
  values (p_actor_user_id, 'mobility_claim_reviewed', 'mobility_claim', successor_id::text,
    jsonb_build_object('decision', 'approved_successor', 'version', prior.version + 1));
  return successor_id;
end;
$$;

revoke all on function public.admin_approve_mobility_claim_successor(uuid, uuid, text, text, text, uuid[], text, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_approve_mobility_claim_successor(uuid, uuid, text, text, text, uuid[], text, text, text, text, text, timestamptz) to service_role;

commit;
