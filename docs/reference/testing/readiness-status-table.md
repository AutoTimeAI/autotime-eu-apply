# Private Beta v1 Readiness Status Table

Last updated: 2026-08-17

Required positioning:

AutoTime EU Apply Private Beta v1 has completed internal technical readiness
testing, including browser E2E verification on clean CI runners, core
authenticated journeys, and automated injection-attack coverage. The product
has a **Conditional GO for controlled beta** per the 15 Aug 2026 QA report.
Public launch readiness is not complete until ICO registration, a manual
Chrome Web Store pre-publication pass, real alert-email verification, real
Stripe checkout/webhook verification, Sentry live dashboard verification,
early-user UAT, and outcome usefulness/trust validation are all completed.

## Readiness Percentages

| Scope | Current Percentage | Meaning |
| --- | --- | --- |
| Internal technical readiness | 90-95% complete | Build, web build, extension build, browser E2E (core journeys + deploy smoke, clean CI runners), Sentry privacy/config checks, core authenticated journeys, and automated user-content injection coverage are all verified. A known Chrome extension broad-permission risk has been identified and fixed in code (17 Aug 2026); a manual Chrome click-through pass remains. |
| Overall beta validation | 70-75% complete | Automated technical evidence is substantially stronger than the 24 May snapshot. Real early-user UAT, Sentry dashboard live verification, and outcome usefulness/trust validation are still pending. Private-beta invite content and feedback tooling are drafted and ready to send. |
| Public launch readiness | Not ready yet | Four named compliance/delivery blockers remain open (ICO registration, Chrome Web Store manual pass, real alert-email verification, real Stripe verification), in addition to UAT, Sentry live check, and outcome validation. |

## Status Table

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Build/web build/extension build | Complete | `pnpm build`, `pnpm build:web`, `pnpm build:extension` all passed; see `docs/beta-release-qa-2026-08-15.md` | Web build required `NODE_OPTIONS=--max-old-space-size=4096` on the first attempt. |
| Browser E2E | Complete | Core journey suite 4/4 passed, deploy smoke 1/1 passed, confirmed on clean GitHub Actions runners (PR #23) | See `docs/testing/core-e2e-and-smoke-report-2026-08-15.md`; supersedes the local-only May evidence. |
| Core beta flow | Complete | Onboarding (CV-upload and build-new-CV branches), ESCO questionnaire, job tracking/tailoring, and export blocking all E2E-verified | `tests/e2e/34-core-journeys.spec.ts`. |
| Cross-user data isolation | Complete | A second authenticated user could not read or insert another user's profile; shared job listings remained readable as intended | `docs/beta-release-qa-2026-08-15.md`. |
| User-content injection coverage | Complete | XSS/HTML/SQL-injection coverage automated and passing after backend hardening | `docs/testing/user-content-injection-audit-2026-08-15.md`. |
| Sentry config/privacy tests | Complete for beta | Sentry config inspection and `pnpm test:web:sentry-privacy` | Error-only replay and redaction are configured. |
| Product-level Sentry observability | Partial/basic to moderate | Sentry config, breadcrumbs and test routes exist | Dashboard live spot-check and alert verification are still pending. |
| Production smoke | Complete | `pnpm test:smoke` passed on clean CI runner, 15 Aug 2026 | 26.1s process time, well within the 60s acceptance ceiling. |
| Chrome extension permission scope | Complete (code), manual pass pending | Content script converted from always-on `*://*/*` injection to on-demand runtime registration; verified via build, typecheck, and full unit test suite, 17 Aug 2026 | Real Chrome install-and-click-through pass on supported ATS pages and the LinkedIn one-time risk notice still needed before Chrome Web Store submission. |
| ICO registration reference | Pending | Privacy policy explicitly marks registration reference as pending | Registration process and fee tier identified; not yet completed. |
| Real alert/welcome email verified | Pending | Send path exists and fires automatically on first login; no confirmed real delivery yet | Sending-domain (`autotime-eu-apply.com`) verification in Resend should be confirmed first. |
| Stripe checkout/webhook verified | Pending | Code reviewed and sound; no real or test-mode transaction run yet | Environment strategy docs already specify the verification approach (preview test-mode, or a real low-risk purchase). |
| Sentry dashboard live spot-check | Pending Manual Evidence | Manual dashboard review required | Live production event verification remains pending until an actual issue is opened and checked for environment, breadcrumbs, replay, stack trace, and sensitive data. |
| Founder-led UAT | Pending | `docs/testing/founder-led-uat-plan.md` | Invite email, feedback questionnaire, and onboarding checklist are drafted and ready to send to real early users. |
| Outcome usefulness/trust | Pending real-user validation | Outcome matrix and UAT plan | Browser flow works; usefulness, trust and commercial value need UAT. |
| Public launch readiness | Not ready yet | Remaining gates above | Private beta readiness does not equal public SaaS launch readiness. |

## Final Verdict

Private Beta v1 — **Conditional GO for controlled, founder-led beta** (15 Aug 2026 QA report), with browser E2E, core authenticated journeys, and injection-attack coverage now verified on clean CI infrastructure. Full public launch validation remains pending until ICO registration, a manual Chrome Web Store pass, real alert-email verification, real Stripe verification, Sentry live dashboard verification, and founder-led UAT are completed.
