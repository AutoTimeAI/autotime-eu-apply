-- getOrCreateStripeCustomer (apps/web/app/api/stripe/checkout/route.ts) reads
-- stripe_customer_id, and if absent, creates a new Stripe customer via the
-- API then upserts it - a read-then-write race: two concurrent checkout
-- requests for the same user (e.g. a double-clicked "Subscribe" button)
-- can both see no stored customer, both create a separate Stripe customer,
-- and both upsert - whichever finishes last silently wins, leaving the
-- other Stripe customer orphaned and, worse, meaning which customer id
-- ends up stored is a race outcome rather than a deterministic choice.
--
-- This RPC makes the "first writer wins" resolution atomic and explicit:
-- COALESCE keeps whatever was already stored rather than the caller's new
-- value, and RETURNING hands back the actual winning id so a caller whose
-- own newly-created customer lost the race can use the correct id for its
-- checkout session instead of its own now-orphaned one.
create or replace function public.claim_stripe_customer_id(
  p_user_id uuid,
  p_stripe_customer_id text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result text;
begin
  insert into public.subscriptions (user_id, stripe_customer_id, plan, status)
  values (p_user_id, p_stripe_customer_id, 'free', 'active')
  on conflict (user_id) do update set
    stripe_customer_id = coalesce(public.subscriptions.stripe_customer_id, excluded.stripe_customer_id)
  returning stripe_customer_id into v_result;

  return v_result;
end;
$$;

comment on function public.claim_stripe_customer_id is
  'Atomically claims a Stripe customer id for a user: if one is already stored, keeps it and returns it (ignoring the caller''s newly-created customer, which the caller should treat as orphaned); otherwise stores and returns the caller''s new id. Resolves the read-then-write race in getOrCreateStripeCustomer deterministically rather than letting concurrent requests silently overwrite each other.';

revoke all on function public.claim_stripe_customer_id(uuid, text)
  from public, anon, authenticated;
grant execute on function public.claim_stripe_customer_id(uuid, text)
  to service_role;
