# Release remediation progress

**Date:** 9 September 2026  
**Scope:** Approved QA remediation items 1–8  
**Current decision:** Conditional hold. Local automated gates and browser-runner stability are verified; release certification still requires production integrations and manual validation.

## Outcome by action

| # | Action | Status | Evidence / remaining work |
| ---: | --- | --- | --- |
| 1 | Restore disk capacity and add preflight | Complete with maintenance debt | Free space was restored and measured between 4.39 and 6.49 GB during validation. Added `scripts/check-free-space.mjs` and wired it into browser suites; it blocks below 2.5 GB. Old dependency trees remain ACL-protected and should be removed administratively later. |
| 2 | Repair Python MVP runner | Complete | Corrected the duplicate module string before the future import. `python -m py_compile` passes and the runner completed its safe reduced run with `Overall: PASS`. |
| 3 | Fix Playwright teardown | Complete | Added an in-process local Next server and explicit global teardown endpoint. Smoke completed 3/3 and exited normally in 17.9 seconds; no test port remained bound. |
| 4 | Standardize safe API errors | Partial | `diagnosticJson` now redacts every 5xx response while retaining the original sanitized server diagnostic. Profile photo and CV-import routes no longer return raw exceptions. Added a regression test. Remaining direct `NextResponse` handlers need migration to the same contract. |
| 5 | Align billing UI/config validation | Complete | Stripe secrets reject recognized placeholders; every actionable product now requires a real price ID. Pricing becomes unavailable when the environment doctor would reject billing. Focused environment tests pass. |
| 6 | Provision real test integrations | Owner action required | Linked project confirmed. Production has core Supabase/Stripe/Resend/OpenAI/PostHog variables but lacks quarterly/credit price IDs and `ANALYTICS_INTERNAL_SECRET`; no Marketplace resources are installed. Stripe, Resend and Sentry provisioning each stopped at legal terms acceptance. |
| 7 | Rerun all 127 browser tests | Complete for local configuration | Final aggregate: 103 passed, 24 production-environment tests skipped by their explicit guards, 0 failed; all 127 cases accounted for in 31.2 minutes. The server stayed alive and teardown completed normally. The 24 skipped cases remain part of item 8's production validation. |
| 8 | Manual extension, accessibility, observability, payment and email validation | Partial / owner action required | Automated accessibility/smoke foundations pass, and the extension build previously passed. Real extension checks, provider delivery/payment events and Sentry ingestion require item 6. |

## Verified gates

- `pnpm typecheck`: pass
- `pnpm lint`: pass
- `pnpm test:unit`: pass, including new error-redaction and Stripe readiness tests
- `python -m py_compile scripts/autotime_mvp_test_runner.py`: pass
- Python MVP reduced run: pass
- `pnpm test:smoke`: 3/3 pass and clean process exit
- Six original full-suite flow failures: 6/6 pass after synchronization repairs
- Final-run flow failures: 2/2 pass after state-aware hydration repairs
- Corrected visual baselines: 4/4 pass in an independent non-update run
- LinkedIn post-reload persistence regression: 1/1 pass
- Vercel account/project link and environment names: verified without exposing values

## Browser-run findings

- The Webpack runner is disk-stable, preserves development-only test authentication, and now shuts down cleanly.
- The first complete run exposed Node's default ~4 GB heap limit at case 88. `scripts/run-playwright.mjs` now provides an 8 GB ceiling; the next complete run reached case 127 without a server crash.
- Several tests interacted while initial route hydration or cold compilation was still replacing client state. Fixed tests now wait on user-visible readiness, URL transitions, or persisted detail hydration.
- Login snapshot baselines were invalid: they captured the application's fallback error page. Desktop and mobile baselines were regenerated from the working login UI and passed a separate normal run.
- The final aggregate run completed with zero failures. Test readiness now distinguishes product interaction time from cold development hydration and uses a 30-second assertion budget inside a two-minute whole-test ceiling.

## Repository size and structure evidence

Measured with generated dependencies/build/test artifacts excluded (`node_modules`, `.next`, `test-results`, `playwright-report`, and automation-run artifacts):

- 728 source/config/documentation files
- 121,963 total lines across those files
- 97,426 implementation and test-support lines (`.ts`, `.tsx`, `.css`, `.mjs`, `.js`, `.py`, `.sql`)
- Largest groups: TypeScript 37,402; TSX 29,369; CSS 13,457; MJS 13,238; Markdown 11,226; YAML 10,627

This is a physical line count, not logical statements, and includes tests and scripts. It should be treated as a reproducible repository-size indicator rather than a productivity metric.

## Required owner actions

1. Review and accept Marketplace terms for:
   - Stripe: `https://vercel.com/rajs-projects-6830d68b/~/integrations/accept-terms/stripe?source=cli`
   - Resend: `https://vercel.com/rajs-projects-6830d68b/~/integrations/accept-terms/resend?source=cli`
   - Sentry: `https://vercel.com/rajs-projects-6830d68b/~/integrations/accept-terms/sentry?source=cli`

2. Supply the missing quarterly/credit Stripe price IDs and `ANALYTICS_INTERNAL_SECRET` through the normal production secret-management process.
3. Remove the ACL-protected old dependency trees under `.remediation-config`, `.remediation-private-beta`, and `node_modules.quarantine-20260826` during host maintenance.

After Marketplace consent, retry provisioning, pull only development/preview variables to an ignored local file, execute the 24 production-guarded cases, and complete provider event verification.
