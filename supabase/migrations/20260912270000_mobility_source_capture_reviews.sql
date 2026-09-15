begin;

create table public.mobility_source_capture_reviews (
  id uuid primary key default gen_random_uuid(),
  source_change_event_id uuid not null unique references public.mobility_source_change_events(id),
  source_version_id uuid not null references public.mobility_source_versions(id),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  scope text not null check (scope = 'capture_integrity'),
  decision text not null check (decision in ('accepted_for_claim_review', 'rejected')),
  reason_codes text[] not null check (cardinality(reason_codes) > 0),
  reviewed_at timestamptz not null default now()
);

create trigger mobility_source_capture_reviews_no_mutation
  before update or delete on public.mobility_source_capture_reviews
  for each row execute function public.reject_mobility_immutable_mutation();
alter table public.mobility_source_capture_reviews enable row level security;
revoke all on public.mobility_source_capture_reviews from public, anon, authenticated;

alter table public.admin_audit_events drop constraint admin_audit_events_action_check;
alter table public.admin_audit_events add constraint admin_audit_events_action_check check (action in (
  'admin_owner_bootstrapped', 'admin_owner_recovery_suspended',
  'beta_access_suspended', 'beta_access_restored',
  'feature_flag_updated', 'market_refresh_requested', 'mobility_source_capture_reviewed'
));
alter table public.admin_audit_events drop constraint admin_audit_events_target_type_check;
alter table public.admin_audit_events add constraint admin_audit_events_target_type_check check (target_type in (
  'admin_membership', 'beta_access', 'feature_flag', 'market_data', 'mobility_source'
));

create function public.admin_review_mobility_source_capture(
  p_actor_user_id uuid,
  p_source_change_event_id uuid,
  p_decision text,
  p_reason_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  captured_version_id uuid;
  review_id uuid;
begin
  if not exists (
    select 1 from public.admin_memberships
    where user_id = p_actor_user_id and status = 'active' and role in ('owner', 'admin')
  ) then raise exception using errcode = '42501', message = 'active owner or admin membership required';
  end if;
  if p_decision not in ('accepted_for_claim_review', 'rejected') or cardinality(p_reason_codes) = 0 then
    raise exception using errcode = '22023', message = 'valid capture-review decision and reason codes required';
  end if;
  select observed_version_id into captured_version_id
  from public.mobility_source_change_events where id = p_source_change_event_id;
  if captured_version_id is null then
    raise exception using errcode = '22023', message = 'source event has no archived observed version';
  end if;

  insert into public.mobility_source_capture_reviews (
    source_change_event_id, source_version_id, reviewer_user_id,
    scope, decision, reason_codes
  ) values (
    p_source_change_event_id, captured_version_id, p_actor_user_id,
    'capture_integrity', p_decision, p_reason_codes
  ) returning id into review_id;

  insert into public.admin_audit_events (actor_user_id, action, target_type, target_id, metadata)
  values (p_actor_user_id, 'mobility_source_capture_reviewed', 'mobility_source', captured_version_id::text,
    jsonb_build_object('decision', p_decision, 'scope', 'capture_integrity'));
  return review_id;
end;
$$;

revoke all on function public.admin_review_mobility_source_capture(uuid, uuid, text, text[]) from public, anon, authenticated;
grant execute on function public.admin_review_mobility_source_capture(uuid, uuid, text, text[]) to service_role;

commit;
