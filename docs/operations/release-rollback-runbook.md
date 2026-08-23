# Release Rollback Runbook

This is genuinely new — `docs/operations-runbook.md` mentions "pause
risky rollout or revert the latest deploy" as a one-line first-response
step but has no detailed rollback procedure. This fills that gap.

## Deployment rollback (Vercel)

1. In the Vercel dashboard, locate the last known-good deployment.
2. Promote it to production (Vercel supports instant rollback to any
   prior deployment without a new build).
3. Verify the rollback took effect: check the served app version/content.
4. **This has never been demonstrated** per this assessment's findings
   (`docs/qa/01-gap-analysis.md` G-06, Gate 17 in the release-readiness
   report). Recommend a founder dry-run before relying on it in a real
   incident.

## Migration rollback

Per `docs/database/migration-production-runbook.md`: **this repository
has no down-migration convention.** Every migration is forward-fix
only. A genuinely broken migration requires either:
- A new, additive corrective migration, or
- A full point-in-time restore (see below) — a much bigger operation.

Plan accordingly: before applying a production migration, consider
whether its failure mode is one a forward-fix can address quickly, or
whether it's risky enough to warrant a backup checkpoint first.

## Database restore (point-in-time or backup)

Per `docs/operations-runbook.md`'s Database Backup And Restore
section: enable scheduled backups, confirm point-in-time recovery
availability, and test a restore into a non-production project. **Per
this assessment's findings, this restore drill has not yet been
demonstrated in any environment.** This is the single highest-value
operational gap to close before a real incident makes it urgent.

## Feature disablement (lighter-weight than a full rollback)

The codebase has a feature-flag system (`admin_feature_flags` table,
hardened this session against a create-time race — PR #164). For an
issue isolated to one feature rather than the whole app, disabling via
a flag is faster and lower-risk than a deployment rollback.

## AI / payment / ingestion disablement

- **AI**: `feature-gate.ts`'s reservation system means AI generation
  can be disabled by making `reserveAiCall` fail closed — **not a
  documented one-step toggle today**; would need a code change or an
  env-var kill switch if this is wanted as a fast-response option.
  **OWNER ACTION REQUIRED**: decide if this is worth adding proactively.
- **Payments**: Stripe checkout can be disabled at the Stripe dashboard
  level (pause the product/price) without any app deployment.
- **Ingestion**: the cron-triggered edge functions
  (`sync-eures`/`sync-job-sources`/`sync-job-alerts`) can be disabled
  by removing/rotating the `CRON_SECRET` they check, or by disabling
  the GitHub Actions schedule directly.

## Post-rollback verification

After any rollback, re-run the local regression suite
(`pnpm test:unit`) against the rolled-back state if possible, and spot
check the specific journey that triggered the rollback before
declaring the incident resolved.
