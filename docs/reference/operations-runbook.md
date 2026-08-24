# Operations Runbook

This is the production operating checklist for AutoTime EU Apply.

## Release Gates

Before production deploy:

1. CI must pass on the branch or PR.
2. `SKIP_LIVE_SMOKE=1 pnpm test:mvp` must pass locally or in CI.
3. Supabase migrations must be applied to development first.
4. Stripe changes must be checked in test mode first.
5. Founder validation evidence must be updated for user-facing release changes.

## Branch Protection

Configure GitHub branch protection for `main`:

- Require a pull request before merging.
- Require at least one approval.
- Require CODEOWNERS review.
- Require status checks to pass.
- Require the `CI / Tests, static checks, and builds` workflow.
- Dismiss stale approvals after new commits.
- Block force pushes.
- Block branch deletion.

## Monitoring

Minimum production monitoring:

- Vercel runtime logs for failed API routes.
- Vercel Web Analytics or PostHog for product usage.
- Stripe dashboard alerts for failed payments and webhook failures.
- Supabase project alerts for database health and API errors.
- Uptime check for the production dashboard.

Suggested alert targets:

- `/`
- `/login`
- `/pricing`
- `/api/account/me`

## Incident Response

Severity levels:

- SEV1: billing, auth, or data isolation issue.
- SEV2: core dashboard or extension workflow is unavailable.
- SEV3: degraded AI, analytics, email, or non-critical feature.

First response:

1. Pause risky rollout or revert the latest deploy.
2. Check Vercel deployment logs.
3. Check Stripe webhook delivery logs if billing is involved.
4. Check Supabase logs and RLS-related errors.
5. Record the incident, impact, cause, fix, and follow-up test.

## Database Backup And Restore

For production Supabase:

- Enable scheduled backups in the Supabase project.
- Confirm point-in-time recovery availability before broad launch.
- Test a restore into a non-production project before relying on it.
- Export schema and migration history before major billing or auth changes.

Restore drill:

1. Create or select a staging Supabase project.
2. Restore the latest production backup into staging.
3. Apply any pending migrations.
4. Run smoke tests against staging credentials.
5. Document restore time and any manual steps.

## Secret Rotation

Rotate secrets when:

- A teammate or automation loses access.
- A credential may have been exposed.
- A provider recommends rotation.
- A production incident touches auth, billing, or database access.

Rotation order:

1. Create the replacement key in the provider dashboard.
2. Add it to Vercel Preview and Production environment variables.
3. Redeploy and verify.
4. Revoke the old key.
5. Record the rotation date.

High-priority secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`

## Production Support

Do not edit production data directly unless the issue is urgent and documented.

Support actions should be:

- Auditable.
- Reversible when possible.
- Limited to one user/account when possible.
- Recorded with timestamp, reason, and result.

Future admin tooling should include:

- User lookup by email.
- Subscription status view.
- AI usage summary.
- Profile sync status.
- Safe account export/delete workflow.
