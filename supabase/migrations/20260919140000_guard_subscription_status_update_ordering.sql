-- customer.subscription.deleted (markSubscriptionCancelled) and
-- invoice.payment_failed (markInvoicePaymentFailed) both bypassed the
-- ordering guard added in 20260919120000_guard_subscription_event_ordering.sql:
-- they wrote straight to public.subscriptions via a plain UPDATE, never
-- touching last_stripe_event_created_at. Stripe does not guarantee webhook
-- delivery order, so a delayed/retried customer.subscription.updated event
-- (carrying an event_created_at newer than the row's last real write, since
-- that write never advanced the guard column) could pass
-- upsert_subscription_from_stripe's ordering check and silently resurrect a
-- subscription this route had already marked cancelled or past_due.
--
-- This RPC closes that gap for status-only updates keyed by
-- stripe_subscription_id (not user_id, since invoice events don't carry a
-- user id) using the same last_stripe_event_created_at guard.
create or replace function public.update_subscription_status_from_stripe(
  p_stripe_subscription_id text,
  p_status text,
  p_plan text,
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
  update public.subscriptions
  set
    status = p_status,
    plan = coalesce(p_plan, plan),
    current_period_end = coalesce(p_current_period_end, current_period_end),
    last_stripe_event_created_at = p_event_created_at,
    updated_at = now()
  where stripe_subscription_id = p_stripe_subscription_id
    and (
      last_stripe_event_created_at is null
      or p_event_created_at > last_stripe_event_created_at
    );

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

comment on function public.update_subscription_status_from_stripe is
  'Atomically applies a status-only update (subscription cancellation, invoice payment failure) from a Stripe event, skipping the write entirely (returns false) if a newer event has already been applied - guards against Stripe''s documented lack of webhook delivery ordering, matching upsert_subscription_from_stripe''s guard for the created/updated path.';

revoke all on function public.update_subscription_status_from_stripe(
  text, text, text, timestamptz, timestamptz
) from public, anon, authenticated;

grant execute on function public.update_subscription_status_from_stripe(
  text, text, text, timestamptz, timestamptz
) to service_role;
