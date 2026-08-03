-- REVIEW ONLY. Expected migration owner: postgres (Supabase migration role).
-- Creates one table, two indexes and one narrowly scoped function.
-- Atomic failure leaves no objects; inspect conflicts rather than dropping them.
begin;

do $preflight$
declare conflict text;
begin
  if to_regnamespace('auth') is null or to_regclass('auth.users') is null then
    raise exception 'workflow events require auth.users';
  end if;
  if to_regprocedure('pg_catalog.gen_random_uuid()') is null then
    raise exception 'workflow events require pg_catalog.gen_random_uuid()';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'anon') then
    raise exception 'workflow events require Supabase database roles';
  end if;
  select string_agg(name, ', ' order by name) into conflict from (
    select c.relname as name from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname in (
        'workflow_operational_events', 'workflow_operational_events_event_created_at_idx',
        'workflow_operational_events_user_created_at_idx'
      )
    union all
    select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='record_workflow_operational_event'
    union all
    select pol.polname from pg_policy pol where pol.polname like 'workflow_operational_events_%'
  ) conflicts(name);
  if conflict is not null then raise exception 'workflow events preflight conflict: %', conflict; end if;
end
$preflight$;

create table public.workflow_operational_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in (
    'job_saved', 'job_analysed', 'application_prepared', 'application_submitted'
  )),
  transition_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, event, transition_id)
);

create index workflow_operational_events_event_created_at_idx
  on public.workflow_operational_events(event, created_at desc);
create index workflow_operational_events_user_created_at_idx
  on public.workflow_operational_events(user_id, created_at desc);
alter table public.workflow_operational_events owner to postgres;

create function public.record_workflow_operational_event(
  p_user_id uuid, p_event text, p_transition_id uuid
)
returns table(outcome text, event_id uuid, created_at timestamptz)
language plpgsql security invoker set search_path = pg_catalog
as $function$
declare v_row public.workflow_operational_events%rowtype;
begin
  if p_user_id is null or p_transition_id is null or p_event not in (
    'job_saved', 'job_analysed', 'application_prepared', 'application_submitted'
  ) then raise exception 'invalid workflow event'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));
  select * into v_row from public.workflow_operational_events e
    where e.user_id=p_user_id and e.event=p_event and e.transition_id=p_transition_id;
  if found then return query select 'duplicate', v_row.id, v_row.created_at; return; end if;
  if (select count(*) from public.workflow_operational_events e
      where e.user_id=p_user_id and e.created_at >= now() - interval '1 minute') >= 30 then
    return query select 'rate_limited', null::uuid, null::timestamptz; return;
  end if;
  insert into public.workflow_operational_events(user_id,event,transition_id)
    values(p_user_id,p_event,p_transition_id) returning * into v_row;
  return query select 'inserted', v_row.id, v_row.created_at;
end
$function$;
alter function public.record_workflow_operational_event(uuid,text,uuid) owner to postgres;

alter table public.workflow_operational_events enable row level security;
revoke all on table public.workflow_operational_events from public, anon, authenticated;
grant select, insert on table public.workflow_operational_events to service_role;
revoke all on function public.record_workflow_operational_event(uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function public.record_workflow_operational_event(uuid,text,uuid)
  to service_role;

comment on table public.workflow_operational_events is
  'Privacy-safe activity events retained raw for 90 days; not durable job/application records.';

-- Manual inspection after application:
-- select relrowsecurity from pg_class where oid='public.workflow_operational_events'::regclass;
-- select grantee, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name='workflow_operational_events';
-- select proname, prosecdef, proconfig from pg_proc where pronamespace='public'::regnamespace and proname='record_workflow_operational_event';
commit;
