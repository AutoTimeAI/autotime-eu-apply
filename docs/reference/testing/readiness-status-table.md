# Private Beta v1 Readiness Status Table

Last updated: 2026-08-24

Required positioning:

AutoTime EU Apply Private Beta v1 has completed internal technical readiness
testing, including browser E2E verification on clean CI runners, core
authenticated journeys, and automated injection-attack coverage. The product
has a **Technical GO for controlled beta** per the 24 Aug 2026 verification.
Public launch readiness is not complete until ICO registration, a manual
Chrome Web Store pre-publication pass, real alert-email verification, real
Stripe checkout/webhook verification, Sentry live dashboard verification,
early-user UAT, and outcome usefulness/trust validation are all completed.

## Readiness Percentages

| Scope | Current Percentage | Meaning |
| --- | --- | --- |
| Internal technical readiness | Complete | On 24 Aug 2026, lint, workspace typechecks, unit/security/privacy suites, web and extension production builds, production smoke, and all 87 browser cases were verified. The one browser visual-contract failure found in the full run was corrected and passed on rerun. |
| Overall beta validation | 75% complete | Automated technical certification is complete. Real early-user UAT, Sentry dashboard live verification, and outcome usefulness/trust validation are still pending. Private-beta invite content and feedback tooling are drafted and ready to send. |
| Public launch readiness | Not ready yet | Four named compliance/delivery blockers remain open (ICO registration, Chrome Web Store manual pass, real alert-email verification, real Stripe verification), in addition to UAT, Sentry live check, and outcome validation. |

## Status Table

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Build/web build/extension build | Complete | `pnpm test:all` passed lint, workspace typechecks, extension production build, and Next.js production build on 24 Aug 2026 | Current production artifacts compile successfully. |
| Browser E2E | Complete | 87/87 cases verified on 24 Aug 2026: 86 passed in the full run; its sole visual-contract failure was fixed in `f53415ec` and the corrected case then passed | The local Playwright process required manual termination after printing results because the development web-server teardown did not exit; no test remained unaccounted for. |
| Core beta flow | Complete | Onboarding (CV-upload and build-new-CV branches), ESCO questionnaire, job tracking/tailoring, and export blocking all E2E-verified | `tests/e2e/34-core-journeys.spec.ts`. |
| Cross-user data isolation | Complete | A second authenticated user could not read or insert another user's profile; shared job listings remained readable as intended | `docs/beta-release-qa-2026-08-15.md`. |
| User-content injection coverage | Complete | XSS/HTML/SQL-injection coverage automated and passing after backend hardening | `docs/testing/user-content-injection-audit-2026-08-15.md`. |
| Extension data-boundary hardening | Complete | CSV spreadsheet-formula neutralisation, bounded location parsing, session-only authentication storage with legacy migration, and background-only authenticated API calls are implemented and covered by extension tests | Commit `23954b9b`; extension typecheck, tests, and production build passed on 24 Aug 2026. |
| Sentry config/privacy tests | Complete for beta | Sentry config inspection and `pnpm test:web:sentry-privacy` | Error-only replay and redaction are configured. |
| Product-level Sentry observability | Partial/basic to moderate | Sentry config, breadcrumbs and test routes exist | Dashboard live spot-check and alert verification are still pending. |
| Production smoke | Complete | `pnpm smoke:web` passed against `https://autotime-eu-apply.vercel.app` on 24 Aug 2026 | Live Private Beta v1 response matched the expected contract. |
| Chrome extension permission scope | Complete (code), manual pass pending | Content script converted from always-on `*://*/*` injection to on-demand runtime registration; verified via build, typecheck, and full unit test suite, 17 Aug 2026 | Real Chrome install-and-click-through pass on supported ATS pages and the LinkedIn one-time risk notice still needed before Chrome Web Store submission. |
| ICO registration reference | Pending | Privacy policy explicitly marks registration reference as pending | Registration process and fee tier identified; not yet completed. |
| Real alert/welcome email verified | Pending | Send path exists and fires automatically on first login; no confirmed real delivery yet | Sending-domain (`autotime-eu-apply.com`) verification in Resend should be confirmed first. |
| Stripe checkout/webhook verified | Pending | Code reviewed and sound; no real or test-mode transaction run yet | Environment strategy docs already specify the verification approach (preview test-mode, or a real low-risk purchase). |
| Sentry dashboard live spot-check | Pending Manual Evidence | Manual dashboard review required | Live production event verification remains pending until an actual issue is opened and checked for environment, breadcrumbs, replay, stack trace, and sensitive data. |
| Founder-led UAT | Pending | `docs/testing/founder-led-uat-plan.md` | Invite email, feedback questionnaire, and onboarding checklist are drafted and ready to send to real early users. |
| Outcome usefulness/trust | Pending real-user validation | Outcome matrix and UAT plan | Browser flow works; usefulness, trust and commercial value need UAT. |
| Public launch readiness | Not ready yet | Remaining gates above | Private beta readiness does not equal public SaaS launch readiness. |

## Final Verdict

Private Beta v1 — **Technical GO for controlled, founder-led beta** (24 Aug 2026), with the internal automated startup-quality gate complete. This is not a public-launch certification. Full public launch validation remains pending until ICO registration, a manual Chrome Web Store pass, real alert-email verification, real Stripe verification, Sentry live dashboard verification, founder-led UAT, and outcome usefulness/trust validation are completed.
