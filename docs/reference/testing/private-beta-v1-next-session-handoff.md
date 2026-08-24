# Private Beta v1 Next Session Handoff

Last updated: 2026-05-24

## Current Official Status

Private Beta v1 - Founder-led early-user ready with browser E2E and production
smoke verified. Full beta validation pending until Sentry live dashboard
verification and founder-led UAT are completed.

This is a private beta / early access beta checkpoint, not a public launch
approval. Do not add Stripe/payment, analytics, or permanent production test
flags as part of the next session.

## Verified Gates

- `pnpm build` passed.
- `pnpm build:web` passed.
- `pnpm test:e2e` passed: 10/10.
- `pnpm smoke:web` passed against `https://autotime-eu-apply.vercel.app`.
- `pnpm test:web:sentry-privacy` passed.
- Sentry privacy/redaction tests passed.
- `/sentry-test` is disabled in production.
- `/api/sentry-test` is protected unless `SENTRY_TEST_API_ENABLED=true`.
- Extension-synced LinkedIn tracked job reflection is covered by browser E2E.

## Pending Gates

- Sentry live dashboard verification.
- Founder-led UAT with 3 to 5 early users.
- Outcome usefulness/trust validation from real users.
- Public launch readiness.

## Exact Next Actions

1. Re-run the local verification checklist below before changing scope.
2. Keep product logic unchanged unless a verified defect blocks the pending
   gates.
3. Do not add Stripe/payment.
4. Do not add analytics.
5. Do not enable `SENTRY_TEST_API_ENABLED` permanently.
6. Complete the controlled Sentry live verification window.
7. Update `docs/testing/sentry-live-dashboard-verification.md` with evidence
   summary after Sentry is verified.
8. Run founder-led UAT with 3 to 5 early users.
9. Update `docs/testing/uat-feedback-log-template.md` or the active UAT
   feedback log with non-sensitive feedback.
10. Update `docs/testing/uat-signoff-summary.md` after enough UAT evidence is
    collected.

## Tomorrow's Command Checklist

```bash
pnpm build
pnpm build:web
pnpm test:e2e
pnpm smoke:web
pnpm test:web:sentry-privacy
```

## Sentry Next-Step Checklist

- Temporarily enable `SENTRY_TEST_API_ENABLED=true` in Vercel only when ready.
- Trigger controlled `/api/sentry-test` event.
- Confirm event in Sentry Issues.
- Check `environment = production`.
- Check breadcrumbs/stack trace/privacy.
- Disable `SENTRY_TEST_API_ENABLED` again.
- Update Sentry live dashboard verification report.

## Sentry Live Verification Steps

1. In Vercel Production environment variables, temporarily set
   `SENTRY_TEST_API_ENABLED=true`.
2. Redeploy or restart production if required for the environment variable to
   apply.
3. Trigger `https://autotime-eu-apply.vercel.app/api/sentry-test` once.
4. Open Sentry and select the AutoTime EU Apply project.
5. Open Issues or Events and inspect the latest controlled production event.
6. Confirm the event shows `environment = production`.
7. Confirm breadcrumbs are present where expected.
8. Confirm stack trace/source-map context is readable.
9. Confirm no CV text, job descriptions, generated cover letter text,
   recruiter message text, emails, phone numbers, visa/share-code data,
   payment data, cookies, auth tokens, API keys, secrets, or DSNs are visible.
10. Disable/remove `SENTRY_TEST_API_ENABLED` in Vercel immediately after the
    check.
11. Redeploy or restart production if required.
12. Confirm `/api/sentry-test` returns 404 again.
13. Update `docs/testing/sentry-live-dashboard-verification.md` with the
    evidence summary. Do not add secrets, tokens, DSNs, private screenshots, or
    sensitive user data.

## UAT Next-Step Checklist

- Select 3 to 5 early users.
- Give founder-led onboarding.
- Ask them to complete full flow.
- Record feedback.
- Update UAT feedback log.
- Update UAT signoff summary.

## UAT Plan Summary

Run founder-guided sessions with 3 to 5 selected early users, preferably UK/EU
tech jobseekers using fake or non-sensitive sample job data. Each participant
should complete job import, EU fit check, save EU fit result, application kit
generation, and waitlist or feedback action.

Collect feedback on clarity, trust, usefulness of EU fit, usefulness of the
application kit, disclaimer comprehension, and whether anything feels
overconfident or legally risky. Do not collect real CV text, full real job
descriptions, phone numbers, visa/share-code data, payment data, cookies,
tokens, API keys, or secrets.

## Final Wording To Use In Docs

Private Beta v1 - Founder-led early-user ready with browser E2E and production
smoke verified. Full beta validation pending until Sentry live dashboard
verification and founder-led UAT are completed.

Use this wording consistently until both pending manual gates are completed.
