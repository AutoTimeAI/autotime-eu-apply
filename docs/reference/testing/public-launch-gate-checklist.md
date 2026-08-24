# Public Launch Gate Checklist

Last updated: 2026-08-17

This checklist decides whether AutoTime EU Apply can move beyond founder-led
private beta. Passing internal technical checks is not enough for public launch.

| Gate | Status | Evidence | Launch impact |
| --- | --- | --- | --- |
| Build passes | Complete | `pnpm build` and `pnpm build:extension` passed; see `docs/beta-release-qa-2026-08-15.md` | Required |
| Web build passes | Complete | `pnpm build:web` passed with `NODE_OPTIONS=--max-old-space-size=4096`; see `docs/beta-release-qa-2026-08-15.md` | Required |
| Browser E2E passes | Complete | Core journey suite (`tests/e2e/34-core-journeys.spec.ts`) 4/4 passed and deploy smoke 1/1 passed on clean GitHub Actions runners, PR #23; see `docs/testing/core-e2e-and-smoke-report-2026-08-15.md` | Required |
| Sentry privacy tests pass | Complete | `pnpm test:web:sentry-privacy` passed | Required |
| Production smoke passes | Complete | `pnpm test:smoke` passed on clean CI runner, 15 Aug 2026 (26.1s process time); see `docs/testing/core-e2e-and-smoke-report-2026-08-15.md` | Required |
| User-content injection coverage | Complete | XSS/HTML/SQL-injection coverage automated and passing after backend CV/outreach bounds and URL validation hardening; see `docs/testing/user-content-injection-audit-2026-08-15.md` | Required |
| Core authenticated journeys | Complete | Onboarding, cross-user RLS isolation, aggregated jobs, ESCO questionnaire, CV workspace, job analysis, and consent-gated analytics all exercised and passed; see `docs/beta-release-qa-2026-08-15.md` | Required |
| Extension broad-permission risk | Complete (code), manual pass pending | `entrypoints/autotime.content.ts` content script no longer auto-injects on `*://*/*`; converted to on-demand (`registration: "runtime"`) injection matching Chrome's Aug 2026 policy guidance. Verified via build, typecheck, and full unit test suite on 17 Aug 2026. A real Chrome install-and-click-through pass (supported ATS pages, LinkedIn one-time risk notice) is still needed before Chrome Web Store submission. | Blocks public launch |
| ICO registration reference | Pending | Privacy policy (`apps/web/app/privacy/page.tsx`) explicitly marks the ICO registration reference as pending; registration not yet completed | Blocks public launch |
| Real alert/welcome email verified | Pending | Welcome-email send path exists and fires automatically on first login, but no real send has been confirmed end-to-end (Resend delivery + sending-domain verification) | Blocks public launch |
| Stripe checkout/webhook verified | Pending | Checkout and webhook code reviewed and sound; no real or test-mode transaction has been run to confirm the live path end-to-end | Blocks public launch |
| Sentry live dashboard spot-check passes | Pending Manual Evidence | Sentry dashboard/insights are accessible, but live production event verification remains pending until an actual AutoTime EU Apply issue is opened and checked for environment, breadcrumbs, replay, stack trace, and sensitive data | Blocks public launch |
| UAT completed with 3-5 users | Pending | No real UAT log/signoff yet. Private-beta invite content, feedback questionnaire, and onboarding checklist are drafted and ready to send | Blocks public launch |
| Outcome usefulness/trust validated | Pending | No real-user outcome summary yet; depends on UAT above | Blocks public launch |
| Compliance disclaimers verified | Complete for beta | Existing app copy/docs | Required |
| No critical bugs open | Partial | Internal test suite passes; one low-severity, environment-side auth edge case observed in production runtime logs (single occurrence, PKCE cookie issue likely tied to cross-browser sign-in) but no code-level fix required; UAT still pending | Blocks if UAT finds critical bugs |
| No sensitive data leakage | Complete for beta | Privacy redaction test passed | Required |
| Feedback loop working | Ready, not completed | UAT docs/templates exist; feedback questionnaire and onboarding checklist ready to use | Required |
| Product copy updated | Complete for beta | Private beta/public launch disclaimers present | Required |
| Beta limitations clear | Complete for beta | Private Beta v1 wording present | Required |
| No false promises | Complete for beta | No job/interview/visa/sponsorship guarantee wording present | Required |
| Launch decision recorded | Pending | Must be updated after ICO registration, Chrome Web Store manual pass, alert email verification, Stripe verification, UAT, and Sentry live check | Required |

## Launch Decision

Current status: **Not Ready for public launch. Conditional GO for controlled/founder-led private beta** (per `docs/beta-release-qa-2026-08-15.md`, 15 Aug 2026).

Since the 24 May 2026 snapshot, technical readiness has advanced substantially: core authenticated journeys, cross-user data isolation, automated injection-attack coverage, and browser E2E/deploy-smoke are now verified on clean CI runners rather than local-only evidence, and a real compliance risk in the Chrome extension's content-script permissions has been identified and fixed in code. What remains before public launch is a defined, short list: complete ICO registration, run a real manual Chrome pre-publication pass, verify one real alert email send, verify Stripe checkout/webhook with a real or test-mode transaction, complete the Sentry live dashboard spot-check, and run founder-led UAT with 3-5 real users (which also supplies the outcome usefulness/trust evidence this table needs). None of these are open-ended engineering work — they are verification steps ready to execute.
