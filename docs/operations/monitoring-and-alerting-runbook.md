# Monitoring and Alerting Runbook

Extends `docs/operations-runbook.md`'s "Monitoring" section (Vercel
logs, PostHog, Stripe alerts, Supabase alerts, uptime checks on
`/`, `/login`, `/pricing`, `/api/account/me`).

## What's verified working

- **Sentry redaction**: 9/9 automated test cases pass, including a
  QA-secret-in-URL end-to-end case. Extended to `diagnostics.ts` this
  session (PR #169). Confirmed via `MON-001` this pass.

## What's configured but deployment-unverified

- **Checkly**: `checkly.config.ts` and `__checks__/` exist in the
  repo. Whether checks are actually deployed and passing is
  **unverified** — this is a previously documented, pre-existing risk
  (not new), re-confirmed unverified this pass (`MON-002`).
  **OWNER ACTION REQUIRED**: check the Checkly dashboard, or run
  `checkly deploy` if it was never done.
- **Sentry alert routing**: redaction is verified; whether an actual
  alert reaches a real recipient is **unverified** (`MON-003`).
  **OWNER ACTION REQUIRED**: trigger a controlled test error and
  confirm you receive the alert.

## Recommended alert thresholds (not yet configured — proposal only)

Given this is an invite-only beta with a small user count, err toward
fewer, higher-signal alerts rather than a large noisy set:

- Any 5xx spike on `/api/ai/*` or `/api/stripe/*` routes (money/cost-adjacent)
- Any Sentry event tagged with an authorization/RLS-related error message
- Uptime failure on `/` or `/login`
- Any `operational_logs` row with `level: "severe"`

**OWNER ACTION REQUIRED**: confirm these are sensible for your actual
alert budget/tolerance, and configure them in whichever tool
(Sentry alert rules, Checkly, Vercel) is the intended source of truth.

## Alert acknowledgement and escalation

`docs/operations-runbook.md` does not currently specify who
acknowledges an alert or how. For a solo-founder-operated beta,
**OWNER ACTION REQUIRED**: confirm whether this is simply "founder
sees it and responds" or whether any other process is intended.

## Verification performed this pass

This assessment confirmed the redaction pipeline works correctly via
automated tests, but could not confirm real alert delivery (no Sentry
dashboard access) or real Checkly deployment (no Checkly access).
Both remain open items in `docs/qa/07-production-verification-checklist.md`.
