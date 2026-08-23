# Migration Verification Report

Companion to `migration-register.csv` (40 migrations catalogued).
This report states plainly what could and could not be verified from
this assessment's environment.

## What was verified

- **Local/repo application order and dependency chain**: all 40
  migrations were read and ordered by their timestamp prefix; no gaps
  or out-of-order dependencies were found (each migration's
  referenced tables exist in an earlier-numbered file).
- **Test coverage tracing back to specific migrations**: 12 of the 40
  migrations have a direct, traceable automated test asserting their
  effect (see the `Evidence` column) — concentrated on the
  highest-risk ones (billing lock, AI-credit atomicity, RPC grants,
  webhook idempotency table, soft-delete tombstones).

## What could not be verified (BLOCKED — G-04)

**Production-applied status for all 40 migrations is unverified.**
This assessment has no Supabase production project access — no
dashboard login, no service-role key, no direct database connection.
Per §13 of the assessment brief: "If production migration history is
not verified, mark the relevant release gate BLOCKED and issue
NO-GO." That is the position recorded here and in Gate 11 of the
final go/no-go report.

**This is not evidence of a problem** — it is an access gap, not a
finding of missing migrations. `docs/environment-strategy.md`
documents the intended process ("Apply Supabase migrations to dev
first, then production after validation") and this session's own
merge history shows migrations landing incrementally alongside their
matching code (e.g. `20260821160000_atomic_ai_call_reservation.sql`
merged in the same PR sprint as the code that depends on it), which
is a good sign the process is followed — but a good sign is not
verification.

## How to close this gap

Either:
1. **Founder grants read access** (Supabase SQL editor or a
   read-only connection string) and this assessment runs the
   `Verification Query` column from `migration-register.csv` against
   production directly, or
2. **Founder runs the queries themselves** against production and
   pastes the results back for this assessment to record as evidence, or
3. **Founder confirms via the Supabase dashboard's migration history
   view** that all 40 are applied, with a screenshot as evidence.

Given `docs/database/migration-production-runbook.md`'s explicit
instruction that this assessment will not apply production migrations
automatically, none of the above involves this assessment writing to
production — only reading/confirming state.

## High-risk migrations meriting extra scrutiny before sign-off

1. **`20260821160000_atomic_ai_call_reservation.sql`** — governs
   money-adjacent AI billing; a partially-applied state here (e.g. if
   the RPC exists but the old reserve/release code path was still
   live) would reintroduce the exact double-billing race this
   session's predecessor sprint fixed (PR #100). Verify the RPC
   function exists AND that no application code still calls a legacy
   reserve pathway.
2. **`20260821170000_stripe_webhook_idempotency.sql`** — if not
   applied, `PAY-003`'s idempotency guarantee has no backing table,
   even though the application code may reference it and appear to
   "work" until a real duplicate webhook arrives.
3. **`20260822130000_grant_classify_job_listings_esco.sql`** — this
   migration itself exists *because* an earlier migration's `revoke`
   silently broke ESCO classification with no error surfaced anywhere
   (a real production bug from before this session). Confirms the
   general pattern: a missing grant fails silently, not loudly — spot
   check grants on all RPCs, not just this one.
