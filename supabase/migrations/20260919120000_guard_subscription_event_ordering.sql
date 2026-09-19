-- Stripe does not guarantee webhook delivery order (documented, not just a
-- theoretical edge case: retries and network conditions can deliver an
-- older event after a newer one). upsertSubscriptionFromStripe
-- (apps/web/app/api/stripe/webhook/route.ts) previously upserted
-- unconditionally on every customer.subscription.created/updated event, with
-- no check against what was already stored - unlike every other sync table
-- in this codebase (job_workflow_jobs, job_workflow_applications,
-- interview_records, mobility_profiles), all of which CAS on a timestamp.
-- A stale event processed after a newer one would silently overwrite
-- current plan/status/period-end with older data.
--
-- Tracks the Stripe event's own `created` timestamp (not this row's
-- updated_at, which a later trigger-driven touch could bump independently
-- of any real Stripe event) and gates the update atomically in SQL via
-- ON CONFLICT ... WHERE, avoiding the read-then-write race a
-- select-then-upsert from application code would have.
alter table public.subscriptions
  add column if not exists last_stripe_event_created_at timestamptz;

create or replace function public.upsert_subscription_from_stripe(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan text,
  p_status text,
  p_current_period_end timestamptz,
  p_event_created_at timestamptz
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer;
begin
  insert into public.subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    plan,
    status,
    current_period_end,
    last_stripe_event_created_at
  ) values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_plan,
    p_status,
    p_current_period_end,
    p_event_created_at
  )
  on conflict (user_id) do update set
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    plan = excluded.plan,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    last_stripe_event_created_at = excluded.last_stripe_event_created_at,
    updated_at = now()
  where public.subscriptions.last_stripe_event_created_at is null
     or excluded.last_stripe_event_created_at > public.subscriptions.last_stripe_event_created_at;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

comment on function public.upsert_subscription_from_stripe is
  'Atomically upserts a subscription row from a Stripe customer.subscription.created/updated event, skipping the write entirely (returns false) if a newer event has already been applied - guards against Stripe''s documented lack of webhook delivery ordering.';

revoke all on function public.upsert_subscription_from_stripe(
  uuid, text, text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.upsert_subscription_from_stripe(
  uuid, text, text, text, text, timestamptz, timestamptz
) to service_role;
