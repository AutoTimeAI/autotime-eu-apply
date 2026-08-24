-- Fix a real race condition: every AI route checked the caller's monthly
-- allowance / purchased-credit balance with a plain read (get_monthly_ai_calls
-- + get_ai_credit_balance) *before* calling OpenAI, then only recorded usage
-- (and, if the allowance was exhausted, atomically consumed a purchased
-- credit via consume_ai_credit) *after* the OpenAI response came back. The
-- expensive, real-money OpenAI call always happened before any atomic gate,
-- so N concurrent requests from the same user - trivial to trigger from a
-- browser or a script - could all pass the non-atomic pre-check
-- simultaneously and all get a real OpenAI generation, regardless of the
-- caller's actual remaining allowance or credit balance. consume_ai_credit's
-- own advisory lock only protected the ledger from going negative; it did
-- nothing to stop the extra OpenAI cost, since it ran after the fact.
--
-- reserve_ai_call closes the gap: it atomically counts this month's usage
-- and, if needed, consumes a purchased credit, *before* the caller is told
-- they may proceed - all under the same per-user advisory lock
-- consume_ai_credit already uses, so no two reservations for one user can
-- ever race each other. The caller supplies the row's id up front (a v4 uuid
-- generated in application code) so the same request can later confirm it
-- with real token/cost data, or release it if the OpenAI call itself fails.

alter table public.ai_usage
  add column if not exists used_credit boolean not null default false;

create or replace function public.reserve_ai_call(
  p_user_id uuid,
  p_reservation_id uuid,
  p_monthly_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':ai_reserve'));

  select count(*) into v_count
  from public.ai_usage
  where user_id = p_user_id
    and created_at >= date_trunc('month', now())
    and created_at < date_trunc('month', now()) + interval '1 month';

  if v_count < p_monthly_limit then
    insert into public.ai_usage (id, user_id, feature, model, used_credit)
    values (p_reservation_id, p_user_id, 'reserved', 'reserved', false);
    return true;
  end if;

  if public.consume_ai_credit(p_user_id, 'reserved') then
    insert into public.ai_usage (id, user_id, feature, model, used_credit)
    values (p_reservation_id, p_user_id, 'reserved', 'reserved', true);
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.confirm_ai_call(
  p_reservation_id uuid,
  p_feature text,
  p_model text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_cost_usd numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_usage
  set
    feature = p_feature,
    model = p_model,
    prompt_tokens = p_prompt_tokens,
    completion_tokens = p_completion_tokens,
    cost_usd = p_cost_usd
  where id = p_reservation_id;
end;
$$;

create or replace function public.release_ai_call(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_used_credit boolean;
begin
  select user_id, used_credit into v_user_id, v_used_credit
  from public.ai_usage
  where id = p_reservation_id;

  if v_user_id is null then
    return;
  end if;

  delete from public.ai_usage where id = p_reservation_id;

  if v_used_credit then
    insert into public.ai_credit_ledger (user_id, delta, reason, feature)
    values (v_user_id, 1, 'refund', 'ai-call-release');
  end if;
end;
$$;

revoke all on function public.reserve_ai_call(uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.confirm_ai_call(uuid, text, text, integer, integer, numeric)
  from public, anon, authenticated;
revoke all on function public.release_ai_call(uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_ai_call(uuid, uuid, integer) to service_role;
grant execute on function public.confirm_ai_call(uuid, text, text, integer, integer, numeric) to service_role;
grant execute on function public.release_ai_call(uuid) to service_role;
