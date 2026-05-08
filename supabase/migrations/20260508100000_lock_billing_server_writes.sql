-- Billing and AI usage are server-authoritative.
-- Clients may read their own state, but only service-role server code should
-- mutate plan, status, Stripe IDs, or usage records.

drop policy if exists "subscriptions_update_own" on public.subscriptions;
drop policy if exists "ai_usage_insert_own" on public.ai_usage;
