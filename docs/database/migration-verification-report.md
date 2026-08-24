# Production migration application and verification procedure

Status: **BLOCKED**. Production history shows the five migrations below are absent. Do not execute any write in this document without explicit founder confirmation immediately before the maintenance action.

## Common preflight and backup

1. Freeze traffic-changing jobs and record current deployed SHA.
2. Obtain a provider-native database backup/PITR restore point; record its identifier and successful status. A logical schema/data export may supplement but not replace a tested restore point.
3. Read-only preflight: query `supabase_migrations.schema_migrations` for all five versions; abort if partially or unexpectedly applied.
4. Confirm dependencies listed in `migration-register.csv` exist.
5. Record table sizes, active sessions and long transactions; choose a low-traffic window.
6. Apply exactly one migration at a time in the order below. Verify before continuing.

## 1 — `20260822100000_pin_get_monthly_ai_calls_grant.sql`

- Purpose: make authenticated execution explicit while RLS continues to scope usage rows.
- Preflight: inspect `pg_proc.proacl`, function owner/security mode, `ai_usage` RLS and policies.
- Apply: execute the exact committed migration through the normal Supabase migration mechanism.
- Verify: `has_function_privilege('authenticated','public.get_monthly_ai_calls(uuid)','EXECUTE')`; as two test users confirm own usage is readable and a spoofed other-user UUID returns no rows/value leakage.
- Forward fix/rollback: revoke execute if unexpected exposure appears; prefer a new corrective migration.
- Risk: Medium—incorrect RLS could expose usage metadata.

## 2 — `20260822110000_explicit_revoke_stripe_events_rate_limits.sql`

- Purpose: explicit default deny for client roles; preserve service-role Stripe event access.
- Preflight: inspect grants, owners, RLS and policies for both tables; ensure webhook uses service role.
- Verify: anon/authenticated have no table privileges; service role can perform required Stripe event operations; webhook test-mode event succeeds once.
- Forward fix: add only the minimum missing service-role privilege in a new migration. Do not grant client roles.
- Risk: High—incorrect grants could expose billing/rate-limit internals or break webhooks.

## 3 — `20260822120000_job_workflow_soft_delete.sql`

- Purpose: add `deleted_at` tombstones and prevent sync resurrection.
- Preflight: ensure both tables exist and neither column exists; record row counts and nullability constraints.
- Verify: both columns exist as nullable `timestamptz`; existing rows remain null; isolated sync test soft-deletes and does not re-adopt the row.
- Forward fix: retain additive columns and correct application behavior; dropping columns risks data loss and is not the preferred rollback.
- Risk: High—schema/application mismatch can break sync or resurrect records.

## 4 — `20260822130000_grant_classify_job_listings_esco.sql`

- Purpose: restore service-role execution of ESCO classification.
- Preflight: verify exact function signature, owner and current ACL; confirm the sync function uses service role.
- Verify: service role has execute; anon/authenticated do not; a bounded test batch classifies a synthetic eligible listing and returns expected counts.
- Forward fix/rollback: revoke service-role execute if behavior is unsafe; correct signature/grant with a new migration.
- Risk: High—wrong grantee expands a security-definer RPC; missing grant keeps classification broken.

## 5 — `20260823100000_admin_feature_flag_create_lock.sql`

- Purpose: advisory-lock new flag creation and preserve optimistic concurrency.
- Preflight: confirm function signature, allowed keys/environments, membership tables and audit table; capture current definition.
- Verify: non-owner call is forbidden; two simultaneous owner creates yield deterministic update/conflict semantics without silent lost update; audit events exist; ACL/owner are expected.
- Forward fix: replace function in a new migration using the captured prior definition if required.
- Risk: High—incorrect function replacement can allow privilege escalation or lost administrative updates.

## Completion evidence

Index the backup identifier/status, redacted command log, applied migration history, each verification query/result, operator, environment, timestamps, branch and deployed/tested SHA. Never place connection strings or tokens in evidence.
