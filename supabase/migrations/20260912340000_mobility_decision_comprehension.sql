begin;

create table public.mobility_decision_comprehension_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  decision_id uuid not null references public.mobility_decision_records(id) on delete cascade,
  consent_id uuid not null references public.mobility_learning_consents(id) on delete cascade,
  version integer not null check (version > 0),
  understood boolean not null,
  reason_code text not null check (reason_code in ('CLEAR', 'UNCLEAR_TERMINOLOGY', 'UNCLEAR_EVIDENCE', 'UNCLEAR_ACTION', 'OTHER')),
  predecessor_response_id uuid references public.mobility_decision_comprehension_responses(id) on delete cascade,
  responded_at timestamptz not null default now(),
  unique(decision_id, version),
  constraint mobility_comprehension_lineage check (
    (version = 1 and predecessor_response_id is null) or (version > 1 and predecessor_response_id is not null)
  ),
  constraint mobility_comprehension_reason_consistency check (
    (understood and reason_code = 'CLEAR') or (not understood and reason_code <> 'CLEAR')
  )
);
create trigger mobility_decision_comprehension_no_mutation before update or delete on public.mobility_decision_comprehension_responses
  for each row execute function public.reject_mobility_immutable_mutation();
alter table public.mobility_decision_comprehension_responses enable row level security;
revoke all on public.mobility_decision_comprehension_responses from public, anon, authenticated;

create function public.append_mobility_decision_comprehension(
  p_user_id uuid, p_decision_id uuid, p_consent_id uuid, p_understood boolean,
  p_reason_code text, p_responded_at timestamptz
) returns uuid language plpgsql security definer set search_path = '' as $$
declare consent public.mobility_learning_consents%rowtype; latest_consent public.mobility_learning_consents%rowtype;
  previous public.mobility_decision_comprehension_responses%rowtype; inserted_id uuid;
begin
  if not exists (select 1 from public.mobility_decision_records where id = p_decision_id and user_id = p_user_id) then
    raise exception using errcode = '42501', message = 'decision does not belong to response owner';
  end if;
  select * into consent from public.mobility_learning_consents where id = p_consent_id;
  select * into latest_consent from public.mobility_learning_consents
    where user_id = p_user_id and effective_at <= p_responded_at order by effective_at desc, version desc limit 1;
  if consent.id is null or consent.user_id <> p_user_id or consent.action <> 'grant'
    or not ('decision_action' = any(consent.scopes)) or consent.effective_at > p_responded_at
    or latest_consent.id is distinct from consent.id then
    raise exception using errcode = '42501', message = 'active decision-action consent required';
  end if;
  if (p_understood and p_reason_code <> 'CLEAR') or (not p_understood and p_reason_code not in ('UNCLEAR_TERMINOLOGY', 'UNCLEAR_EVIDENCE', 'UNCLEAR_ACTION', 'OTHER')) then
    raise exception using errcode = '22023', message = 'comprehension response and reason disagree';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_decision_id::text, 0));
  select * into previous from public.mobility_decision_comprehension_responses where decision_id = p_decision_id order by version desc limit 1;
  insert into public.mobility_decision_comprehension_responses(
    user_id, decision_id, consent_id, version, understood, reason_code, predecessor_response_id, responded_at
  ) values (
    p_user_id, p_decision_id, p_consent_id, coalesce(previous.version, 0) + 1,
    p_understood, p_reason_code, previous.id, p_responded_at
  ) returning id into inserted_id;
  return inserted_id;
end;
$$;
revoke all on function public.append_mobility_decision_comprehension(uuid, uuid, uuid, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.append_mobility_decision_comprehension(uuid, uuid, uuid, boolean, text, timestamptz) to service_role;

commit;
