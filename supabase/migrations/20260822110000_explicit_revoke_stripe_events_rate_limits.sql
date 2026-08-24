-- stripe_webhook_events and ai_rate_limits both already have RLS enabled
-- with zero policies, which is a safe default-deny for anon/authenticated
-- regardless of table-level GRANTs - but every other service-role-only
-- table in this schema (admin_memberships, admin_audit_events,
-- market_refresh_requests, workflow_operational_events,
-- platform_coverage_reports) backs that up with an explicit
-- `revoke all ... from public, anon, authenticated`, so the safety doesn't
-- depend solely on nobody ever adding a permissive policy later without
-- noticing the missing revoke. Bringing these two in line with that
-- pattern for defense-in-depth - no behaviour change, since RLS already
-- denies everything to anon/authenticated today.
revoke all on table public.stripe_webhook_events from public, anon, authenticated;
grant select, insert, delete on table public.stripe_webhook_events to service_role;

revoke all on table public.ai_rate_limits from public, anon, authenticated;
