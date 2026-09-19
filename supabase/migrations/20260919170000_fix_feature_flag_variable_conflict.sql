-- Second occurrence of the same bug class fixed in
-- 20260919160000_fix_beta_access_variable_conflict.sql, found by checking
-- every other function in this codebase sharing the RETURNS TABLE +
-- ON CONFLICT shape after that first fix. This one is worse: unlike
-- admin_change_beta_access (which only failed once a row already existed),
-- this function's RETURNS TABLE(outcome text, key text, environment text,
-- enabled boolean, version bigint, updated_at timestamptz) collides with
-- its own `on conflict (key, environment)` unconditionally - confirmed
-- live against production with admin_feature_flags completely empty (a
-- genuinely first-ever call, no existing row, no conflict to resolve):
--   ERROR: 42702: column reference "key" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
-- This means every admin attempt to toggle role_pathways_enabled,
-- nvidia_role_mapping_enabled, or market_refresh_enabled, in any
-- environment, has always failed - the feature-flag admin tool has never
-- worked in production.
--
-- Same fix as before: #variable_conflict use_column, which does not
-- change the function's RETURNS TABLE column names or external contract.
create or replace function public.admin_update_feature_flag(
  p_actor_user_id uuid, p_key text, p_environment text, p_enabled boolean, p_expected_version bigint
)
returns table(outcome text, key text, environment text, enabled boolean, version bigint, updated_at timestamptz)
language plpgsql security invoker set search_path = pg_catalog
as $function$
#variable_conflict use_column
declare v_row public.admin_feature_flags%rowtype;
begin
  if not exists (select 1 from public.admin_memberships m where m.user_id = p_actor_user_id and m.status = 'active' and m.role = 'owner')
    then raise exception 'forbidden'; end if;
  if p_key not in ('role_pathways_enabled', 'nvidia_role_mapping_enabled', 'market_refresh_enabled')
     or p_environment not in ('development', 'preview', 'production') or p_expected_version is null or p_expected_version < 0
    then raise exception 'invalid feature flag request'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key || ':' || p_environment, 0));
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
