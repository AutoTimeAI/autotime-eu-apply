-- Found during the pre-release security-advisor sweep (Supabase security
-- advisors, run 2026-09-19). Two independent WARN-level findings, both
-- real and both cheap to close - neither changes any application
-- behaviour, since every real call site already uses the service-role
-- admin client, never the anon/authenticated client role.
--
-- 1. `increment_ai_rate_limit` had no EXECUTE restriction, so it was
--    directly callable by any signed-in OR anonymous request via
--    `/rest/v1/rpc/increment_ai_rate_limit` with attacker-chosen
--    p_rate_limit_key/p_window_seconds/p_max_requests. Confirmed via
--    grep that every real call site (apps/web/lib/openai-server.ts,
--    apps/web/lib/diagnostics.ts, the cv/github and sync/refresh routes)
--    uses createAdminClient() exclusively - client-role access was never
--    needed. Left open, this allowed poisoning another user's rate-limit
--    key or flooding the table with arbitrary keys.
-- 2. `create_free_subscription_for_new_user` and
--    `create_user_account_from_auth` are AFTER INSERT triggers on
--    auth.users. Postgres itself blocks calling a trigger function
--    directly outside trigger context, so this was lower risk, but the
--    Supabase linter's own defense-in-depth recommendation is followed
--    here: revoke the otherwise-unused direct RPC surface.
--
-- Also: two functions flagged for a mutable search_path
-- (function_search_path_mutable) - pinned explicitly rather than relying
-- on the caller's search_path, per the same advisor pass.

revoke execute on function public.increment_ai_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.create_free_subscription_for_new_user() from public, anon, authenticated;
revoke execute on function public.create_user_account_from_auth() from public, anon, authenticated;

alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.autotime_normalize_application_url(text) set search_path = pg_catalog, public;
