# Migration Production Runbook

This assessment does not apply production migrations. This runbook
documents the procedure for the founder (or whoever holds production
Supabase access) to apply and verify them safely.

## Pre-flight

1. Confirm the target migration(s) have already been applied and
   validated in a dev/staging Supabase project first, per
   `docs/environment-strategy.md`'s hard rule ("Apply Supabase
   migrations to dev first, then production after validation").
2. Take a manual backup/snapshot immediately before applying to
   production, even if automated backups are configured (belt and
   braces for a manual operation).
3. Review the migration file for any `drop`/`revoke`/destructive
   statement — several existing migrations in this repo are
   themselves fixes for an earlier migration's overly-broad `revoke`
   (see `migration-verification-report.md`'s high-risk-migrations
   section) — this is a real, previously-hit failure mode in this
   codebase, not a hypothetical.

## Apply

```
supabase db push --project-ref <production-project-ref>
```

or apply via the Supabase SQL editor for a single migration if more
control is wanted.

## Verify

Run the corresponding `Verification Query` from
`docs/database/migration-register.csv` for the migration(s) just
applied. For the three high-risk migrations flagged in
`migration-verification-report.md`, additionally:

- **AI-credit atomicity**: confirm no application code path still
  calls a pre-atomic reserve/release function.
- **Stripe webhook idempotency**: send one real (test-mode) duplicate
  webhook event and confirm only one fulfilment occurs.
- **ESCO classification grant**: run one classification RPC call and
  confirm it returns a result rather than a silent permission failure.

## Record

After applying and verifying, update `docs/database/migration-register.csv`'s
`Production Status` column from `Unverified` to `Applied` (with the
date), and update `docs/release/release-candidate-record.md` if this
was part of closing out the release-candidate's deployment-verification
gate.

## Rollback

This repository has no down-migration convention (confirmed — no
`*.down.sql` files exist alongside any migration). The strategy for
every migration in this register is **forward-fix only**: if a
migration causes a production issue, the fix is a new, additive
migration that corrects the problem, not a reverse-applied down
migration. This is a real constraint to plan around, not an oversight
to silently work around — a genuinely broken migration requires either
a new corrective migration or a full point-in-time restore (see
`docs/operations/release-rollback-runbook.md`).
