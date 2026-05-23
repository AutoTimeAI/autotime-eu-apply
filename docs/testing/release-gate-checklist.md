# Private Beta v1 Release Gate Checklist

Last updated: 2026-05-24

Final gate status: Private Beta v1 — Ready for founder-led early users with
browser E2E verified.

AutoTime EU Apply Private Beta v1 has completed internal technical readiness
testing, including browser E2E verification. The product is ready for
founder-led early users, but full beta validation is not complete until
Sentry live verification, early-user UAT, and outcome usefulness/trust
validation are completed.

Use fake data only. Do not enter real CV text, real job descriptions, email,
phone, visa/share-code data, payment data, cookies, tokens, API keys, or
secrets during QA.

## Readiness Percentages

| Scope | Current Percentage | Meaning |
| --- | --- | --- |
| Internal technical readiness | 80-85% complete | Build, web build, browser E2E and Sentry privacy/config checks are verified for private beta. |
| Overall beta validation | 65-70% complete | Production smoke now passes, but real early-user UAT, Sentry dashboard live verification and outcome validation are still pending. |
| Public launch readiness | Not ready yet | Public launch requires production smoke, UAT evidence, live monitoring spot-checks and stronger outcome-quality validation. |

## Readiness Table

| Area | Status | Notes |
| --- | --- | --- |
| Build/web build | Complete | Passed after rerun outside Windows EPERM sandbox file-lock. |
| Browser E2E | Complete, 9/9 passed | Full Playwright browser suite passed with 0 failures. |
| Core beta flow | Complete | Job import -> EU fit -> application kit -> waitlist / feedback is browser verified. |
| Sentry config/privacy tests | Complete for beta | Error-only replay and privacy redaction are configured and tested. |
| Product-level Sentry observability | Partial/basic to moderate | Config, breadcrumbs and test routes exist; live dashboard spot-check remains pending. |
| Production smoke | Complete | `pnpm smoke:web` passed against `https://autotime-eu-apply.vercel.app` on 2026-05-24. |
| Sentry dashboard live spot-check | Pending Manual Evidence | Sentry dashboard/insights are accessible, but live production event verification remains pending until an actual AutoTime EU Apply issue is opened and checked for environment, breadcrumbs, replay, stack trace, and sensitive data. |
| Founder-led UAT | Pending | 3 to 5 selected early users still need guided sessions. |
| Outcome usefulness/trust | Pending real-user validation | Application kit usefulness and EU fit trust need UAT feedback. |
| Public launch readiness | Not ready yet | Private beta readiness does not equal public launch readiness. |

## Completed Internal Gates

- [x] Core flow is browser E2E verified.
- [x] Browser E2E passed 9/9.
- [x] Build/web build passed after rerun outside Windows EPERM file-lock.
- [x] Sentry client/server/edge config exists in `apps/web`.
- [x] Session Replay remains error-only.
- [x] Breadcrumbs exist for the MVP flow.
- [x] Source maps are configured through `withSentryConfig`.
- [x] Sentry auth token is not exposed to client code.
- [x] Privacy redaction is in place for sensitive event fields.
- [x] Payment/Stripe is intentionally deferred.
- [x] Analytics/PostHog is intentionally deferred.

## Pending Gates

- [x] Production smoke passes against the live URL.
- [ ] Sentry dashboard live spot-check confirms client/server events,
  breadcrumbs and error-only replay.
- [ ] Founder-led UAT with 3 to 5 selected early users is completed.
- [ ] Outcome usefulness/trust is validated with real-user feedback.
- [ ] Public launch readiness review is completed.

## Product Promise Gate

- [x] No job guarantee.
- [x] No interview guarantee.
- [x] No visa guarantee.
- [x] No sponsorship guarantee.
- [x] Users must verify employer requirements.
- [x] Users must verify official immigration/government guidance where relevant.

## Final Release Decision

Private Beta v1 — Founder-led early-user ready with browser E2E and production smoke verified. Full beta validation pending until Sentry live dashboard verification and founder-led UAT are completed.

Full public launch: Not ready yet.
