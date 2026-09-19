-- Real production bug found via live testing: admin_change_beta_access's
-- RETURNS TABLE(user_id uuid, status text, updated_at timestamptz) creates
-- implicit PL/pgSQL variables named user_id/status/updated_at that collide
-- with the beta_access table's own column names of the same name.
-- Confirmed live: calling this function against a user who ALREADY has a
-- beta_access row (i.e. every real "approve a pending user" or "suspend an
-- active user" admin action - the row only gets created once, on the
-- first-ever grant/suspend) throws:
--   ERROR: 42702: column reference "user_id" is ambiguous
--   DETAIL: It could refer to either a PL/pgSQL variable or a table column.
-- at the `on conflict (user_id)` clause. A brand-new user's very first
-- beta_access row (a plain INSERT, no conflict) never touches this path,
-- which is why this went undetected until an admin tried to act on an
-- existing row.
--
-- Fixed with #variable_conflict use_column, PL/pgSQL's own documented
-- mechanism for exactly this situation: it tells the function to prefer
-- the table-column interpretation over the OUT-parameter interpretation
-- wherever a bare identifier is ambiguous between them, without changing
-- the function's external signature or RETURNS TABLE column names (so
-- every caller - the admin API route, the beta-access admin UI - keeps
-- working unchanged).
create or replace function public.admin_change_beta_access(
  p_actor_user_id uuid, p_target_user_id uuid, p_status text, p_reason text
)
returns table(user_id uuid, status text, updated_at timestamptz)
language plpgsql security invoker set search_path = pg_catalog
as $function$
#variable_conflict use_column
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
