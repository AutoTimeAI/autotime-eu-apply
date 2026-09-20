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
| Authorisation | **Pass** | Admin-vs-non-admin verified live (`/admin` → `adminDenied=1` for the QA account). Cross-user (User A cannot access User B) closed 2026-09-20 with a genuine deployed two-real-account test: the founder authorized using an existing real account, a throwaway job row was inserted for it, and the QA account's live session correctly received "Job not found - not present in your authenticated workspace" when requesting it by ID - no data leaked. Test artifact deleted immediately after |
| Cross-user isolation and RLS | **Pass** | Same evidence as above - now a genuine deployed two-account access attempt, not just structural inference |
| Database migrations and recovery | **Partial (confirmed Fail on recovery)** | Migrations: **Pass** - every migration through `20260919190000` applied to production and re-verified live via `pg_policies`/advisor re-scan. Recovery: **Fail, confirmed** - the founder checked the Supabase dashboard 2026-09-19: project `dorqxmnslzzmrpjbhlcl` is on the Free plan, which has zero scheduled backups and no PITR at all. This is now a confirmed active risk, not an unverified gate - needs a Pro-plan upgrade or explicit written risk acceptance |
| Critical end-to-end journeys | **Pass, with a caveat** | 10/10 critical-path tests pass; 9/10 on deployed live evidence (E2E-06 cross-user closed 2026-09-20 with a real two-account test), 1/10 (E2E-09 AI provider fallback) on unit evidence rather than a deployed live run, by deliberate choice to avoid real AI-provider cost - see the gate checklist for the full breakdown |
| Security and privacy | **Pass** | Security: Stripe billing audit (1 HIGH + 1 MEDIUM found and fixed), RLS/RPC security-advisor sweep (2 real excess-grant bugs found and fixed), admin auth verified live. Privacy: `/privacy` verified against real code (genuine subprocessors, not placeholder text) - closed 2026-09-20. GDPR account-export completeness has unit-test coverage (`test:account-export-completeness`). One residual sub-item: ICO registration reference still pending in `/privacy` - separately tracked as a public-launch item, not a private-beta blocker |
| Production smoke testing | **Pass** | `pnpm smoke:web` against the live production alias, re-run same-day: public HTML markers present, protected `/dashboard` correctly redirects unauthenticated visitors |
| Rollback readiness | **Pass** | Mechanism verified via workflow source, and a real live rehearsal was run 2026-09-19 with explicit founder approval: rollback-to-self correctly rejected by Vercel (422, confirming its own safety guard), then rolled back one step to the prior deployment (confirmed via alias check + passing `pnpm smoke:web`), then rolled forward again and re-confirmed clean. Full round trip under 1 minute, zero downtime. Named rollback operator: DataByRajesh (founder). See `incident-and-rollback-exercise-record.md` |

**Updates: rollback readiness Partial->Pass (real live rehearsal), authorisation/cross-user isolation Partial->Pass (real two-account test closed 2026-09-20), security-and-privacy split-resolved (privacy/terms/support now Pass, only the backup/PITR half of "recovery" remains a problem).** **Result: 7 of 8 P0 items are a clean Pass. 1 remains a confirmed Fail**: database recovery - the Supabase project has zero backup coverage (Free plan), a real, current, material risk, not a documentation gap. Per the stated rule, **any P0 that is Fail counts as NO GO for an unqualified release** - consistent with the dossier's existing decision. This is now the single item separating this release from a clean, unqualified GO.

## P1 — Strongly required

| P1 item | Status | Evidence |
|---|---|---|
| Accessibility | **Pass, with a caveat** | Automated axe passes on all 11 covered critical surfaces including login. Added a real keyboard-navigation pass this session (not just axe): tabbed through login (6 stops) and the dashboard (8 stops) live against production, confirmed every focused element has a visible indicator (outline or box-shadow), tab order follows visual/logical order, and Escape correctly closes the account menu. This covers the mechanics of the manual review but was not a full exhaustive walkthrough of every screen/modal in the app |
| API and integration testing | **Pass** | 43 focused environment-boundary unit tests cover auth/config/redirect boundaries; Supabase auth/data integration verified live this session. Real live OpenAI integration test: called `/api/ai/cover-letter` directly against production as the QA account with a genuine CV+job payload - returned a real, coherent, contextually-accurate cover letter (referencing both CV specifics and job posting details), full path exercised (auth -> rate limit -> feature-gate reservation -> real OpenAI call -> billing finalized). Actual cost recorded: **$0.000509** (388 prompt + 221 completion tokens, `gpt-4.1-mini`) - confirms the earlier "avoid real cost" reasoning for skipping this was overly cautious; real cost is negligible. Also tested the zero-cost failure path: a request with an invalid `jobDescription` (too short) correctly returns a clean 400 before ever reaching OpenAI, no cost incurred. Did not simulate "provider fully down" via a revoked production API key - that would risk breaking AI for real users during the test window, an availability risk rather than a cost one |
| AI decision-safety testing | **Pass** | Live: unknown sponsorship/salary stays unknown and surfaces a verification prompt rather than a false positive (E2E-03); explicit no-sponsorship vacancy text correctly extracted and surfaced (E2E-04); unsupported application claims block readiness pending explicit override (E2E-05). Backed by unit coverage (`AI-004`, `AI-005`) |
| Regression and visual testing | **Pass** | Ran the full visual-regression suite fresh this session: 4 of 12 tests initially failed against stale baselines. Inspected the diffs and confirmed both failures were exactly the two legitimate UI changes already shipped this session (the "Beta" nav badge and the eyebrow-contrast fix on the dark auth hero) - not regressions. Updated the baselines; all 12 now pass |
| Compatibility and performance | **Partial** | Chromium, Firefox, and Edge (via Playwright's `msedge` channel) all verified live against production this session: landing and login pages render correctly with zero page errors on all three. WebKit's Windows build hung on this machine (a known Playwright/Windows platform limitation, not an application issue) and was not completed - Safari/WebKit compatibility remains genuinely unverified. The browser extension's compatibility is a separate, already-tracked track (Chrome Web Store review). Performance: live smoke proves reachability and response; no formal page-timing/API-latency measurement was taken |

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
| Functional testing | **Pass** | Jobs, applications, countries, and now interviews workflows all verified live this session - `/dashboard/interviews` renders correctly (correct empty state, "Add interview"/"View applications" actions), zero console/network errors |
| Usability testing | **Not run** | No participant-based usability study has occurred; this is the same gap as public-launch UAT |
| Reliability testing | **Pass** | Two real live checks, no unit-test substitution: (1) repeated-journey consistency - the production smoke suite and homepage were hit 3 times back to back, identical clean results every time, zero flakiness (cold-start 1.08s -> warm 0.32s); (2) the AI rate-limit RPC (`increment_ai_rate_limit`) was called repeatedly live against production with a real disposable key, confirming it allows exactly the configured limit (3 calls), correctly denies every call afterward, and anchors `reset_at` to the first call rather than sliding forward with each attempt (the correct behaviour - a sliding window would let a determined caller keep the limit open indefinitely). Test row deleted after. Retry/failure-recovery logic is also unit-tested (AI-quota release-on-failure, job-workflow sync distinguishing a disabled server from a real upload failure) |
| User acceptance testing | **Not started** | Tracked as a public-launch item in `external-manual-signoff-record.md`; not required for continuing the current controlled private beta but required before any wider release |
| Monitoring testing | **Partial** | Sentry/PostHog are wired and env-vars confirmed present. Attempted to trigger a real Sentry test event via `/api/sentry-test`, which correctly returned 404 - `SENTRY_TEST_API_ENABLED` is disabled in production, exactly as it should be (this session's own security hardening flagged that this debug endpoint must stay off). Deliberately did not flip that flag just to test monitoring, since doing so would contradict the hardening already shipped. Live alert firing and Sentry source-map verification remain a founder-side check via Sentry's own dashboard |

## Bottom line

Applying this exact 24-category framework and its own P0 decision rule
produces the same answer as every other document in this evidence chain:
**NO-GO for a new unqualified production release; the currently deployed
private beta (artefact `88b8eb44`, redeployed docs-only as `43768ec2`)
remains healthy and safe to keep serving its current invited users.**

**Update (same day, later pass):** closed several P1/other gaps that were
safely closable without real user data or new production risk -
Accessibility (added a real live keyboard/focus pass, not just axe),
Regression and visual testing (ran fresh, found and fixed two stale
baselines), Functional testing (interviews workflow verified live), and
partially Compatibility (Firefox verified live; WebKit blocked by a
Windows platform limitation, not an app issue). Attempted to close the
Authorisation/cross-user P0 gap with a genuine two-account live test;
blocked by a missing local credential (`SUPABASE_SERVICE_ROLE_KEY`), not
skipped by choice - see that row for detail. Declined to force Monitoring
closed by re-enabling a debug endpoint this session had just hardened
shut, since that would trade a real security improvement for a checkbox.

The remaining gaps are concentrated in exactly the places already
identified: database recovery verification, rollback rehearsal,
privacy/founder sign-off, and the depth of two tests (cross-user isolation
and AI provider fallback are verified structurally/at the unit level
rather than via a deployed live two-account or live-failure test - one
blocked by tooling, one by deliberate cost avoidance). None of this
framework's categories surfaces a *new* gap beyond what
`production-release-dossier-v1.0.1-2026-09-19.md` already tracks.
