-- Stripe delivers webhooks at-least-once, so the same event.id can arrive
-- more than once (redelivery after a timeout, a manual resend from the
-- Stripe dashboard, etc). Most handlers in the webhook route are already
-- naturally idempotent (upsert/update-by-key), but sending the "upgrade
-- confirmed" email on customer.subscription.created is not: a redelivery
-- would email the user a second time. This table lets the route claim an
-- event.id before processing it and release the claim if processing fails,
-- so genuine retries still reprocess but a redelivery of an already-handled
-- event is skipped.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now(),
  constraint stripe_webhook_events_event_id_present
    check (length(trim(event_id)) > 0)
);

alter table public.stripe_webhook_events enable row level security;
