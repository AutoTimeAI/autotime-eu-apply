-- REVIEW ONLY. Expected migration owner: postgres (Supabase migration role).
-- Creates six tables, one index, four functions and one trigger.
-- Recovery is inspection-led: because this transaction is atomic, any failure
-- rolls back every object. Do not automate rollback or remove objects.
begin;

do $preflight$
declare
  conflict text;
begin
  if to_regnamespace('auth') is null or to_regclass('auth.users') is null then
    raise exception 'admin foundation requires auth.users';
  end if;
  if to_regprocedure('pg_catalog.gen_random_uuid()') is null then
    raise exception 'admin foundation requires pg_catalog.gen_random_uuid()';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role')
     or not exists (select 1 from pg_roles where rolname = 'authenticated')
     or not exists (select 1 from pg_roles where rolname = 'anon') then
    raise exception 'admin foundation requires Supabase database roles';
  end if;

  select string_agg(name, ', ' order by name) into conflict
  from (
    select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in (
        'admin_memberships', 'admin_audit_events', 'beta_access',
        'beta_feedback', 'admin_feature_flags', 'market_refresh_requests',
        'admin_audit_events_created_at_idx'
      )
    union all
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname in (
        'reject_admin_audit_event_changes', 'admin_change_beta_access',
        'admin_update_feature_flag', 'admin_request_market_refresh'
      )
    union all
    select t.tgname from pg_trigger t where not t.tgisinternal
      and t.tgname = 'admin_audit_events_append_only'
    union all
    select pol.polname from pg_policy pol where pol.polname like 'admin_%'
  ) conflicts(name);
  if conflict is not null then
    raise exception 'admin foundation preflight conflict: %', conflict;
  end if;
end
$preflight$;

create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'support', 'analyst')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.admin_audit_events (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in (
    'admin_owner_bootstrapped', 'admin_owner_recovery_suspended',
    'beta_access_suspended', 'beta_access_restored',
    'feature_flag_updated', 'market_refresh_requested'
  )),
  target_type text not null check (target_type in (
    'admin_membership', 'beta_access', 'feature_flag', 'market_data'
  )),
  target_id text check (target_id is null or length(target_id) between 1 and 180),
  metadata jsonb not null default '{}'::jsonb check (
    jsonb_typeof(metadata) = 'object' and pg_column_size(metadata) <= 2048
  ),
  created_at timestamptz not null default now()
);

create table public.beta_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  suspension_reason text check (suspension_reason is null or length(suspension_reason) <= 180),
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (status <> 'suspended' or length(trim(suspension_reason)) between 4 and 180)
);

create table public.beta_feedback (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null check (length(category) between 1 and 80),
  rating smallint check (rating between 1 and 5),
  message text not null check (length(message) between 1 and 4000),
  product_area text not null check (length(product_area) between 1 and 80),
  route text check (route is null or length(route) <= 200),
  status text not null default 'New' check (status in ('New', 'Reviewing', 'Planned', 'Resolved', 'Closed')),
  internal_notes text check (internal_notes is null or length(internal_notes) <= 4000),
  technical_context jsonb not null default '{}'::jsonb check (
    jsonb_typeof(technical_context) = 'object' and pg_column_size(technical_context) <= 4096
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_feature_flags (
  key text not null check (key in ('role_pathways_enabled', 'nvidia_role_mapping_enabled', 'market_refresh_enabled')),
  enabled boolean not null default false,
  environment text not null check (environment in ('development', 'preview', 'production')),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (key, environment)
);

create table public.market_refresh_requests (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  idempotency_key text not null unique check (idempotency_key ~ '^[A-Za-z0-9_-]{12,80}$'),
  provider text not null check (provider = 'esco'),
  country text check (country is null or length(country) <= 80),
  status text not null default 'requested' check (status in ('requested', 'running', 'succeeded', 'failed')),
  requested_by uuid not null references auth.users(id) on delete restrict,
  failure_reason text check (failure_reason is null or length(failure_reason) <= 300),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index admin_audit_events_created_at_idx
  on public.admin_audit_events(created_at desc);

alter table public.admin_memberships owner to postgres;
alter table public.admin_audit_events owner to postgres;
alter table public.beta_access owner to postgres;
alter table public.beta_feedback owner to postgres;
alter table public.admin_feature_flags owner to postgres;
alter table public.market_refresh_requests owner to postgres;

create function public.reject_admin_audit_event_changes()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
begin
  raise exception 'admin audit events are append-only';
end
$function$;

create trigger admin_audit_events_append_only
before update or delete on public.admin_audit_events
for each row execute function public.reject_admin_audit_event_changes();

create function public.admin_change_beta_access(
  p_actor_user_id uuid, p_target_user_id uuid, p_status text, p_reason text
)
returns table(user_id uuid, status text, updated_at timestamptz)
language plpgsql security invoker set search_path = pg_catalog
as $function$
declare v_action text;
begin
  if not exists (
    select 1 from public.admin_memberships m where m.user_id = p_actor_user_id
      and m.status = 'active' and m.role in ('owner', 'admin')
  ) then raise exception 'forbidden'; end if;
  if p_status not in ('active', 'suspended') or p_target_user_id is null
     or (p_status = 'suspended' and length(trim(p_reason)) not between 4 and 180) then
    raise exception 'invalid beta access request';
  end if;
  insert into public.beta_access as b
    (user_id, status, suspension_reason, approved_at, updated_at, updated_by)
  values (p_target_user_id, p_status,
    case when p_status = 'suspended' then trim(p_reason) else null end,
    case when p_status = 'active' then now() else null end, now(), p_actor_user_id)
  on conflict (user_id) do update set
    status = excluded.status, suspension_reason = excluded.suspension_reason,
    approved_at = coalesce(b.approved_at, excluded.approved_at),
    updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  v_action := case when p_status = 'suspended' then 'beta_access_suspended' else 'beta_access_restored' end;
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
  values (p_actor_user_id, v_action, 'beta_access', p_target_user_id::text,
    jsonb_build_object('nextStatus', p_status, 'reason', left(coalesce(trim(p_reason), ''), 180)));
  return query select b.user_id, b.status, b.updated_at from public.beta_access b where b.user_id = p_target_user_id;
end
$function$;

create function public.admin_update_feature_flag(
  p_actor_user_id uuid, p_key text, p_environment text, p_enabled boolean, p_expected_version bigint
)
returns table(outcome text, key text, environment text, enabled boolean, version bigint, updated_at timestamptz)
language plpgsql security invoker set search_path = pg_catalog
as $function$
declare v_row public.admin_feature_flags%rowtype;
begin
  if not exists (select 1 from public.admin_memberships m where m.user_id = p_actor_user_id and m.status = 'active' and m.role = 'owner')
    then raise exception 'forbidden'; end if;
  if p_key not in ('role_pathways_enabled', 'nvidia_role_mapping_enabled', 'market_refresh_enabled')
     or p_environment not in ('development', 'preview', 'production') or p_expected_version is null or p_expected_version < 0
    then raise exception 'invalid feature flag request'; end if;
  select * into v_row from public.admin_feature_flags f where f.key = p_key and f.environment = p_environment for update;
  if found and v_row.version <> p_expected_version then
    return query select 'conflict', v_row.key, v_row.environment, v_row.enabled, v_row.version, v_row.updated_at; return;
  elsif not found and p_expected_version <> 0 then
    return query select 'conflict', p_key, p_environment, false, 0::bigint, null::timestamptz; return;
  end if;
  insert into public.admin_feature_flags as f(key, environment, enabled, version, updated_at, updated_by)
  values (p_key, p_environment, p_enabled, 1, now(), p_actor_user_id)
  on conflict (key, environment) do update set enabled = excluded.enabled,
    version = f.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by
  returning * into v_row;
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
  values (p_actor_user_id, 'feature_flag_updated', 'feature_flag', left(p_key || ':' || p_environment, 180),
    jsonb_build_object('flagKey', p_key, 'enabled', p_enabled, 'version', v_row.version));
  return query select 'updated', v_row.key, v_row.environment, v_row.enabled, v_row.version, v_row.updated_at;
end
$function$;

create function public.admin_request_market_refresh(
  p_actor_user_id uuid, p_idempotency_key text
)
returns table(outcome text, id uuid, status text, created_at timestamptz)
language plpgsql security invoker set search_path = pg_catalog
as $function$
declare v_row public.market_refresh_requests%rowtype;
begin
  if not exists (select 1 from public.admin_memberships m where m.user_id = p_actor_user_id and m.status = 'active' and m.role in ('owner', 'admin'))
    then raise exception 'forbidden'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9_-]{12,80}$' then raise exception 'invalid refresh request'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor_user_id::text, 0));
  select * into v_row from public.market_refresh_requests r where r.idempotency_key = p_idempotency_key;
  if found then return query select 'duplicate', v_row.id, v_row.status, v_row.created_at; return; end if;
  if exists (select 1 from public.market_refresh_requests r where r.requested_by = p_actor_user_id and r.created_at >= now() - interval '1 minute') then
    return query select 'rate_limited', null::uuid, null::text, null::timestamptz; return;
  end if;
  insert into public.market_refresh_requests(idempotency_key, provider, requested_by)
  values (p_idempotency_key, 'esco', p_actor_user_id) returning * into v_row;
  insert into public.admin_audit_events(actor_user_id, action, target_type, target_id, metadata)
  values (p_actor_user_id, 'market_refresh_requested', 'market_data', left(p_idempotency_key, 180), jsonb_build_object('provider', 'esco'));
  return query select 'requested', v_row.id, v_row.status, v_row.created_at;
end
$function$;

alter table public.admin_memberships enable row level security;
alter function public.reject_admin_audit_event_changes() owner to postgres;
alter function public.admin_change_beta_access(uuid, uuid, text, text) owner to postgres;
alter function public.admin_update_feature_flag(uuid, text, text, boolean, bigint) owner to postgres;
alter function public.admin_request_market_refresh(uuid, text) owner to postgres;
alter table public.admin_audit_events enable row level security;
alter table public.beta_access enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.admin_feature_flags enable row level security;
alter table public.market_refresh_requests enable row level security;

revoke all on table public.admin_memberships, public.admin_audit_events,
  public.beta_access, public.beta_feedback, public.admin_feature_flags,
  public.market_refresh_requests from public, anon, authenticated;
grant select on table public.admin_memberships to service_role;
grant select, insert, update on table public.beta_access,
  public.admin_feature_flags, public.market_refresh_requests to service_role;
grant select, insert, update on table public.beta_feedback to service_role;
grant select, insert on table public.admin_audit_events to service_role;
revoke all on function public.reject_admin_audit_event_changes(),
  public.admin_change_beta_access(uuid, uuid, text, text),
  public.admin_update_feature_flag(uuid, text, text, boolean, bigint),
  public.admin_request_market_refresh(uuid, text) from public, anon, authenticated;
grant execute on function public.reject_admin_audit_event_changes(),
  public.admin_change_beta_access(uuid, uuid, text, text),
  public.admin_update_feature_flag(uuid, text, text, boolean, bigint),
  public.admin_request_market_refresh(uuid, text) to service_role;

-- Manual inspection after application:
-- select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname like 'admin_%';
-- select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema='public' and table_name like 'admin_%';
-- select proname, prosecdef, proconfig from pg_proc where pronamespace='public'::regnamespace and proname like 'admin_%';
commit;
