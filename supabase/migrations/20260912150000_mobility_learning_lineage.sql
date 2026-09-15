-- Consent-scoped, append-only linkage from governed decisions to behavior and outcomes.
begin;

create table public.mobility_learning_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null check (version > 0),
  policy_version text not null,
  action text not null check (action in ('grant', 'revoke')),
  scopes text[] not null default '{}',
  predecessor_consent_id uuid references public.mobility_learning_consents(id) on delete cascade,
  effective_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (user_id, version),
  constraint mobility_learning_consents_scopes check (
    scopes <@ array['decision_action', 'correction', 'employer_response', 'application_outcome']::text[]
    and ((action = 'grant' and cardinality(scopes) > 0) or (action = 'revoke' and cardinality(scopes) = 0))
  ),
  constraint mobility_learning_consents_lineage check (
    (version = 1 and predecessor_consent_id is null) or (version > 1 and predecessor_consent_id is not null)
  )
);

create table public.mobility_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_id uuid not null references public.mobility_learning_consents(id) on delete cascade,
  decision_id uuid not null references public.mobility_decision_records(id) on delete cascade,
  application_id uuid references public.applications(id) on delete cascade,
  outcome_record_id uuid references public.outcome_records(id) on delete cascade,
  correction_id uuid references public.mobility_decision_corrections(id) on delete cascade,
  event_type text not null check (event_type in ('decision_viewed', 'apply_started', 'applied', 'skipped', 'employer_contacted', 'employer_response', 'correction_submitted', 'interview', 'offer', 'rejected', 'withdrawn', 'no_response')),
  evidence_class text not null check (evidence_class in ('observed', 'user_reported', 'system_derived')),
  payload jsonb not null default '{}',
  event_sha256 text not null check (event_sha256 ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  idempotency_key text not null unique,
  constraint mobility_learning_events_payload_object check (jsonb_typeof(payload) = 'object')
);

create function public.validate_mobility_learning_event()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare consent_row public.mobility_learning_consents%rowtype;
declare latest_consent_row public.mobility_learning_consents%rowtype;
declare required_scope text;
begin
  select * into consent_row from public.mobility_learning_consents where id = new.consent_id;
  if consent_row.id is null or consent_row.user_id <> new.user_id then
    raise exception 'learning consent does not belong to event owner';
  end if;
  select * into latest_consent_row from public.mobility_learning_consents
    where user_id = new.user_id and effective_at <= new.occurred_at
    order by effective_at desc, version desc limit 1;
  if consent_row.action <> 'grant' or consent_row.effective_at > new.occurred_at
     or latest_consent_row.id is distinct from consent_row.id then
    raise exception 'learning event occurred without active referenced consent';
  end if;
  required_scope := case
    when new.event_type in ('decision_viewed', 'apply_started', 'applied', 'skipped') then 'decision_action'
    when new.event_type = 'correction_submitted' then 'correction'
    when new.event_type in ('employer_contacted', 'employer_response') then 'employer_response'
    else 'application_outcome'
  end;
  if not (required_scope = any(consent_row.scopes)) then raise exception 'learning event scope not consented'; end if;
  if not exists (select 1 from public.mobility_decision_records where id = new.decision_id and user_id = new.user_id) then
    raise exception 'learning decision does not belong to event owner';
  end if;
  if new.application_id is not null and not exists (select 1 from public.applications where id = new.application_id and user_id = new.user_id) then
    raise exception 'learning application does not belong to event owner';
  end if;
  if new.outcome_record_id is not null and not exists (select 1 from public.outcome_records where id = new.outcome_record_id and user_id = new.user_id) then
    raise exception 'learning outcome does not belong to event owner';
  end if;
  return new;
end;
$$;

create function public.append_mobility_learning_consent(
  p_user_id uuid, p_policy_version text, p_action text, p_scopes text[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare previous_row public.mobility_learning_consents%rowtype;
declare inserted_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into previous_row from public.mobility_learning_consents
    where user_id = p_user_id order by version desc limit 1;
  insert into public.mobility_learning_consents (
    user_id, version, policy_version, action, scopes, predecessor_consent_id, effective_at
  ) values (
    p_user_id, coalesce(previous_row.version, 0) + 1, p_policy_version,
    p_action, p_scopes, previous_row.id, now()
  ) returning id into inserted_id;
  return inserted_id;
end;
$$;

create trigger mobility_learning_events_validate
  before insert on public.mobility_learning_events
  for each row execute function public.validate_mobility_learning_event();
create trigger mobility_learning_consents_no_update
  before update on public.mobility_learning_consents
  for each row execute function public.reject_mobility_version_update();
create trigger mobility_learning_events_no_update
  before update on public.mobility_learning_events
  for each row execute function public.reject_mobility_version_update();

create index mobility_learning_events_decision_time_idx on public.mobility_learning_events(decision_id, occurred_at);
create index mobility_learning_events_user_time_idx on public.mobility_learning_events(user_id, occurred_at desc);
alter table public.mobility_learning_consents enable row level security;
alter table public.mobility_learning_events enable row level security;
revoke all on public.mobility_learning_consents from anon, authenticated;
revoke all on public.mobility_learning_events from anon, authenticated;
revoke all on function public.validate_mobility_learning_event() from public, anon, authenticated;
revoke all on function public.append_mobility_learning_consent(uuid, text, text, text[]) from public, anon, authenticated;

commit;
