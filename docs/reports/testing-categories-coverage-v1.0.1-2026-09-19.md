# Testing Categories & Coverage — Private Beta v1.0.1

Canonical mapping of the 24 testing categories (and P0/P1/P2 release
priority) defined for AutoTime AI v1.0.1 against actual evidence already
gathered in this repo as of 2026-09-19. This does not replace
`production-release-dossier-v1.0.1-2026-09-19.md` (the go/no-go record) or
`release-gate-checklist-v1.0.1-2026-09-19.md` (the mandatory-gate table) -
it's the category-by-category lens requested, cross-referenced to the same
underlying evidence so nothing is claimed twice with different answers.

**Decision rule applied literally, per the brief: "A private beta should
remain NO GO if any P0 test is failed, blocked, unknown, or lacks
evidence."**

## P0 — Mandatory before release

| P0 item | Status | Evidence |
|---|---|---|
| Clean installation and builds | **Pass** | `pnpm typecheck`/`lint`/`test:unit`/`build:web` all exit 0, re-run same-day against the current deployed SHA |
| Authentication | **Pass** | Live: login reaches `/dashboard`; sign-out redirects to `/login?loggedOut=1`; revisiting `/dashboard` after sign-out bounces to login, no cached content served (E2E-01, E2E-10) |
| Authorisation | **Partial** | Admin-vs-non-admin verified live (`/admin` → `adminDenied=1` for the QA account). Cross-user (User A cannot access User B) verified **structurally only** - dual-layer `.eq("user_id", userId)` app-level scoping + RLS `(select auth.uid()) = user_id` policies confirmed via source and live `pg_policies`, not with two real live accounts (E2E-06, deliberately not run live to avoid touching real users' data) |
| Cross-user isolation and RLS | **Partial** | Same evidence as above - real, but structural, not a deployed two-account access attempt |
| Database migrations and recovery | **Partial** | Migrations: **Pass** - every migration through `20260919190000` applied to production and re-verified live via `pg_policies`/advisor re-scan. Recovery: **Open** - no tool available inspects Supabase backup/PITR configuration; needs a human check of the dashboard |
| Critical end-to-end journeys | **Pass, with a caveat** | 10/10 critical-path tests pass; 8/10 on deployed live evidence, 2/10 (E2E-06 cross-user, E2E-09 AI provider fallback) on structural/unit evidence rather than a deployed live run - see the gate checklist for the full breakdown |
| Security and privacy | **Partial** | Security: **Pass** - Stripe billing audit (1 HIGH + 1 MEDIUM found and fixed), RLS/RPC security-advisor sweep (2 real excess-grant bugs found and fixed), admin auth verified live. Privacy: **Open** - no formal data-minimisation/log-retention/deletion audit run this cycle; GDPR account-export completeness has unit-test coverage (`test:account-export-completeness`) but the broader privacy-notice/retention question is founder-owned and unconfirmed |
| Production smoke testing | **Pass** | `pnpm smoke:web` against the live production alias, re-run same-day: public HTML markers present, protected `/dashboard` correctly redirects unauthenticated visitors |
| Rollback readiness | **Partial** | Mechanism verified by reading `.github/workflows/production-deploy.yml` (captures previous READY deployment, auto-rolls-back on failed smoke) and by it firing correctly in earlier production history. **No rehearsal has been run this cycle**, and no named rollback operator exists |

**Result: 4 of 8 P0 items are a clean Pass. 4 are Partial** (authorisation, cross-user/RLS, database recovery, security-and-privacy, rollback readiness - five listed, four distinct gaps since two share the same underlying evidence). Per the stated rule, **any P0 that is Partial/Open counts as NO GO for an unqualified release** - consistent with the dossier's existing decision. The Partial items are not failures; they're either (a) real evidence gathered at a shallower depth than "deployed two-account live test" for good reasons (avoiding touching real user data or real AI-provider cost), or (b) genuinely founder/ops-owned and outside what this session can close alone.

## P1 — Strongly required

| P1 item | Status | Evidence |
|---|---|---|
| Accessibility | **Partial** | Automated axe passes on all 11 covered critical surfaces including login (login's test-harness hang was found and fixed this session). Manual keyboard/focus/contrast review has not been performed - axe does not substitute for it |
| API and integration testing | **Partial** | 43 focused environment-boundary unit tests cover auth/config/redirect boundaries; Supabase auth/data integration verified live this session. AI-provider fallback is unit-tested (`AI-008`), not exercised against a real live provider failure (deliberately, to avoid real cost) |
| AI decision-safety testing | **Pass** | Live: unknown sponsorship/salary stays unknown and surfaces a verification prompt rather than a false positive (E2E-03); explicit no-sponsorship vacancy text correctly extracted and surfaced (E2E-04); unsupported application claims block readiness pending explicit override (E2E-05). Backed by unit coverage (`AI-004`, `AI-005`) |
| Regression and visual testing | **Partial** | Full automated suite reruns on every CI push (regression). Visual-snapshot tests exist and pass, but no dedicated same-day full visual-diff re-run was performed specifically for this release cycle beyond what CI already covers |
| Compatibility and performance | **Partial** | All testing this session used Chromium (Playwright default) against desktop viewports; Edge/Firefox/Safari and the browser extension's compatibility were not verified this cycle. Performance: live smoke proves reachability and response; no formal page-timing/API-latency measurement was taken |

## P2 — May continue during controlled beta

Not blocking. Current state, for completeness:

| P2 item | Status |
|---|---|
| Wider browser/device coverage | Not run this cycle (Chromium only) |
| Larger load tests | Not run - no concurrent-user load test exists for this cycle |
| Minor visual improvements | Not applicable - no known open visual defects |
| Additional usability experiments | Not run - no formal usability study conducted |
| Unsupported-country and rare edge cases | Partially covered - unsupported country (Belgium) verified live showing correct "Limited coverage" explorer treatment (E2E-08); broader rare-edge-case sweep not performed |

## Full 24-category cross-reference

For categories not already covered by the P0/P1/P2 tables above:

| Category | Status | Note |
|---|---|---|
| Unit testing | **Pass** | Full `pnpm test:unit` suite - mobility suite 175/175, AI quality 10/10, Stripe webhook logic 19/19, plus dozens of other focused suites |
| Component testing | **Partial** | No dedicated component-test framework (e.g. React Testing Library) is in active use; component-level behaviour (forms, tabs, checklists, error messages) is covered indirectly through Playwright E2E interactions rather than isolated component tests |
| Functional testing | **Partial** | Jobs, applications, and countries workflows verified live this session; interviews workflow was not exercised live this cycle |
| Usability testing | **Not run** | No participant-based usability study has occurred; this is the same gap as public-launch UAT |
| Reliability testing | **Partial** | Retry/failure-recovery logic exists and is unit-tested (e.g. AI-quota release-on-failure tests, job-workflow sync distinguishing a disabled server from a real upload failure); no dedicated chaos/repeated-failure drill was run live |
| User acceptance testing | **Not started** | Tracked as a public-launch item in `external-manual-signoff-record.md`; not required for continuing the current controlled private beta but required before any wider release |
| Monitoring testing | **Partial** | Sentry/PostHog are wired and env-vars confirmed present; live alert firing and Sentry source-map verification have not been confirmed this cycle (tracked as open in the dossier) |

## Bottom line

Applying this exact 24-category framework and its own P0 decision rule
produces the same answer as every other document in this evidence chain:
**NO-GO for a new unqualified production release; the currently deployed
private beta (artefact `88b8eb44`, redeployed docs-only as `43768ec2`)
remains healthy and safe to keep serving its current invited users.**

The gaps are concentrated in exactly the places already identified:
database recovery verification, rollback rehearsal, privacy/founder
sign-off, and the depth of a few P0/P1 tests (cross-user isolation and AI
provider fallback were verified structurally/at the unit level rather than
via a deployed live two-account or live-failure test, by deliberate
choice to avoid real user-data exposure or real cost). None of this
framework's categories surfaces a *new* gap beyond what
`production-release-dossier-v1.0.1-2026-09-19.md` already tracks.
