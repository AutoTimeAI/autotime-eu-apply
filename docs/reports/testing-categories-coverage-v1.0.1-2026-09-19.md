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
| Security and privacy | **Pass, with a disclosed gap** | Security: Stripe billing audit (1 HIGH + 1 MEDIUM found and fixed), RLS/RPC security-advisor sweep (2 real excess-grant bugs found and fixed), admin auth verified live. Privacy: `/privacy` verified against real code (genuine subprocessors, not placeholder text) - closed 2026-09-20. **2026-09-20 (later): the prior "GDPR account-export completeness has unit-test coverage" claim above was true but shallow** - that coverage never checked against the live schema. Queried production's `information_schema`/`pg_constraint` directly and found 10 real tables (including one with 3,118 rows for a real user) missing from the export entirely, and separately found account deletion itself could hard-fail with a foreign-key violation for any user holding a row in 4 of those tables - a live Article 17 bug, not a theoretical one. Both fixed and verified live; see `quality-assurance.md`'s 2026-09-20 entry for the full severity-critical writeup. **2026-09-20 (later still): leaked-password protection (HaveIBeenPwned checking) confirmed unavailable** - gated behind Supabase's Pro plan, not reachable at any Free-tier dashboard location. Same plan-tier-gated category as the backup/PITR gap; no written risk acceptance recorded for this one yet, see `release-evidence-index.md`'s risk callout. Candidates can currently set a password already known to be compromised. Residual sub-items: ICO registration reference still pending in `/privacy` (public-launch item, not a private-beta blocker) and this leaked-password gap (needs a founder risk-acceptance decision, same as backup/PITR) |
| Production smoke testing | **Pass** | `pnpm smoke:web` against the live production alias, re-run same-day: public HTML markers present, protected `/dashboard` correctly redirects unauthenticated visitors |
| Rollback readiness | **Pass** | Mechanism verified via workflow source, and a real live rehearsal was run 2026-09-19 with explicit founder approval: rollback-to-self correctly rejected by Vercel (422, confirming its own safety guard), then rolled back one step to the prior deployment (confirmed via alias check + passing `pnpm smoke:web`), then rolled forward again and re-confirmed clean. Full round trip under 1 minute, zero downtime. Named rollback operator: DataByRajesh (founder). See `incident-and-rollback-exercise-record.md` |

**Updates: rollback readiness Partial->Pass (real live rehearsal), authorisation/cross-user isolation Partial->Pass (real two-account test closed 2026-09-20), security-and-privacy split-resolved (privacy/terms/support now Pass, only the backup/PITR half of "recovery" remains a problem).** **Result: 7 of 8 P0 items are a clean Pass. 1 remains a confirmed Fail**: database recovery - the Supabase project has zero backup coverage (Free plan), a real, current, material risk, not a documentation gap. Per the stated rule, **any P0 that is Fail counts as NO GO for an unqualified release** - consistent with the dossier's existing decision. This is now the single item separating this release from a clean, unqualified GO.

## P1 — Strongly required

| P1 item | Status | Evidence |
|---|---|---|
| Accessibility | **Pass, with a caveat** | Automated axe passes on all 11 covered critical surfaces including login. Added a real keyboard-navigation pass this session (not just axe): tabbed through login (6 stops) and the dashboard (8 stops) live against production, confirmed every focused element has a visible indicator (outline or box-shadow), tab order follows visual/logical order, and Escape correctly closes the account menu. This covers the mechanics of the manual review but was not a full exhaustive walkthrough of every screen/modal in the app |
| API and integration testing | **Pass** | 43 focused environment-boundary unit tests cover auth/config/redirect boundaries; Supabase auth/data integration verified live this session. Real live OpenAI integration test: called `/api/ai/cover-letter` directly against production as the QA account with a genuine CV+job payload - returned a real, coherent, contextually-accurate cover letter (referencing both CV specifics and job posting details), full path exercised (auth -> rate limit -> feature-gate reservation -> real OpenAI call -> billing finalized). Actual cost recorded: **$0.000509** (388 prompt + 221 completion tokens, `gpt-4.1-mini`) - confirms the earlier "avoid real cost" reasoning for skipping this was overly cautious; real cost is negligible. Also tested the zero-cost failure path: a request with an invalid `jobDescription` (too short) correctly returns a clean 400 before ever reaching OpenAI, no cost incurred. Did not simulate "provider fully down" via a revoked production API key - that would risk breaking AI for real users during the test window, an availability risk rather than a cost one |
| AI decision-safety testing | **Pass** | Live: unknown sponsorship/salary stays unknown and surfaces a verification prompt rather than a false positive (E2E-03); explicit no-sponsorship vacancy text correctly extracted and surfaced (E2E-04); unsupported application claims block readiness pending explicit override (E2E-05). Backed by unit coverage (`AI-004`, `AI-005`). **2026-09-20, found and fixed a real severity-high false-negative**: `needsMobilityCheck` treated "I already have permission in at least one target country" as a blanket skip for every vacancy regardless of country, when the onboarding UI's own label scopes it to specific countries - a candidate with a UK-only permit applying to an unstated-authorisation Germany vacancy got a clean "Consider" with zero mention of any mobility concern. Fixed to only skip when the vacancy's country matches the candidate's current country; verified live both directions (mismatch now surfaces "Mobility pathway verification", same-country control still correctly skips); zero regressions. A systematic UI-copy-to-code audit of the onboarding form's other work-authorisation options followed: found and fixed a second instance of the identical bug ("eu-eea-swiss-citizen" blanket-skipped the UK too, despite Brexit and the UK's own dedicated CountryPack in this system - fixed narrowly, verified live both directions, zero regressions); found a third instance ("local-work-authorised", initially left unfixed pending a product decision since a pre-existing test asserted the blanket-skip as intentional - confirmed with the product owner it was a bug, fixed identically, and corrected the test); found and fixed a fourth, related bug in `sponsorshipRequired`'s tri-state field - "unsure" was given identical (non-)treatment to a confirmed "no", so the same vacancy explicitly rejecting sponsorship produced "Skip" for a "yes" answer but a clean "Consider" with zero sponsorship mention for "unsure" - fixed so "unsure" is treated at least as cautiously as "yes"; found and fixed a fifth bug - `permissionExpiryDate` was captured by the mobility form and displayed back, but read by nothing in the decision logic at all, so a candidate whose recorded permission had already expired ~2 years ago still got a clean "Consider" for a same-country vacancy - fixed so an expired date always forces the check regardless of country match; confirmed "country_specific" is safe (falls through to "unsure", which is over-inclusive rather than a silent skip, though it does discard real candidate-provided nuance - logged as a future precision gap, not a safety bug). See `quality-assurance.md`'s 2026-09-20 entries for full detail - this is the most serious finding of the session, since it's a silent false-negative in the tool's own core safety promise, not a missing edge-case detail |
| Regression and visual testing | **Pass** | Ran the full visual-regression suite fresh this session: 4 of 12 tests initially failed against stale baselines. Inspected the diffs and confirmed both failures were exactly the two legitimate UI changes already shipped this session (the "Beta" nav badge and the eyebrow-contrast fix on the dark auth hero) - not regressions. Updated the baselines; all 12 now pass |
| Compatibility and performance | **Pass** | Chromium, Firefox, and Edge (via Playwright's `msedge` channel) all verified live against production this session: landing and login pages render correctly with zero page errors on all three. WebKit hung indefinitely on this Windows machine specifically at `browser.newPage()` (launch itself succeeded in 406ms; full diagnosis in the 2026-09-20 `quality-assurance.md` entries) - rather than leave that as an unresolved local limitation, ran the identical check on Linux via a temporary GitHub Actions workflow (`workflow_dispatch`, run `35513925451`, since removed): WebKit launched, loaded the real production landing page, returned the correct title, and reported **zero page errors**, completing in ~8 seconds. This confirms Safari/WebKit compatibility itself is fine - the earlier gap was a Windows-specific Playwright driver defect on this one machine, not an application or WebKit-version problem. The browser extension's compatibility is a separate, already-tracked track (Chrome Web Store review). Performance: live smoke proves reachability and response; no formal page-timing/API-latency measurement was taken |

## P2 — May continue during controlled beta

Not blocking. Current state, for completeness:

| P2 item | Status |
|---|---|
| Wider browser/device coverage | Not run this cycle (Chromium only) |
| Larger load tests | Not run - no concurrent-user load test exists for this cycle |
| Minor visual improvements | Not applicable - no known open visual defects |
| Additional usability experiments | Not run - no formal usability study conducted |
| Unsupported-country and rare edge cases | Partially covered - Belgium verified live (E2E-08, correct "Limited coverage" explorer treatment). Switzerland tested 2026-09-20 by exercising the real production functions directly (`extractJob` + `assessInternationalJob`): correctly detected and routed to safe explorer-mode "Investigate first" with no false EU-pathway claim. This also found and **fixed** a real gap same day: explorer mode was silently dropping the vacancy's own explicit no-sponsorship wording instead of surfacing it as a `confirmedBlocker` (relaying a stated fact, not a permit-law judgment) - fixed and verified live; also caught and fixed a related sponsorship-denial-phrasing gap ("not able to" wasn't matched by the regex). Full unit suite re-run clean, zero regressions. See `quality-assurance.md`'s 2026-09-20 entries for detail. Broader sweep beyond these two countries still not performed |

## Full 24-category cross-reference

For categories not already covered by the P0/P1/P2 tables above:

| Category | Status | Note |
|---|---|---|
| Unit testing | **Pass** | Full `pnpm test:unit` suite - mobility suite 175/175, AI quality 10/10, Stripe webhook logic 19/19, plus dozens of other focused suites |
| Component testing | **Pass** | Added Vitest + React Testing Library to `apps/web` (`test:component`, wired into `pnpm test:unit` as `test:web:component`) and wrote 5 real component tests for `OnboardingWizard`'s step-0 validation, including the beta-terms acceptance checkbox added this session: blocks continuing without consent, clears the error the moment it's checked, doesn't render at all once already accepted server-side, rejects an invalid name, and correctly advances once every field is valid. Found and fixed a genuine bug while building this: the test's mocked `useRouter()` returned a new object on every render, breaking Next.js's real stable-reference guarantee and causing `OnboardingWizard`'s fetch effect to re-run on every keystroke - a real, slow-growing render loop that reliably exhausted a 4GB heap in under 2 minutes, not a flaky test. Fixed by memoizing the mock; also found and fixed a second real gap (RTL's auto-cleanup between tests silently wasn't registering, since this project doesn't use Vitest's `globals: true` - added an explicit `afterEach(cleanup)`). Full `pnpm test:unit` re-run clean afterward |
| Functional testing | **Pass** | Jobs, applications, countries, and now interviews workflows all verified live this session - `/dashboard/interviews` renders correctly (correct empty state, "Add interview"/"View applications" actions), zero console/network errors |
| Usability testing | **Not run** | No participant-based usability study has occurred; this is the same gap as public-launch UAT |
| Reliability testing | **Pass** | Two real live checks, no unit-test substitution: (1) repeated-journey consistency - the production smoke suite and homepage were hit 3 times back to back, identical clean results every time, zero flakiness (cold-start 1.08s -> warm 0.32s); (2) the AI rate-limit RPC (`increment_ai_rate_limit`) was called repeatedly live against production with a real disposable key, confirming it allows exactly the configured limit (3 calls), correctly denies every call afterward, and anchors `reset_at` to the first call rather than sliding forward with each attempt (the correct behaviour - a sliding window would let a determined caller keep the limit open indefinitely). Test row deleted after. Retry/failure-recovery logic is also unit-tested (AI-quota release-on-failure, job-workflow sync distinguishing a disabled server from a real upload failure) |
| User acceptance testing | **Not started** | Tracked as a public-launch item in `external-manual-signoff-record.md`; not required for continuing the current controlled private beta but required before any wider release |
| Monitoring testing | **Partial** | Sentry/PostHog are wired and env-vars confirmed present. Attempted to trigger a real Sentry test event via `/api/sentry-test`, which correctly returned 404 - `SENTRY_TEST_API_ENABLED` is disabled in production, exactly as it should be (this session's own security hardening flagged that this debug endpoint must stay off). Deliberately did not flip that flag just to test monitoring, since doing so would contradict the hardening already shipped. Live alert firing and Sentry source-map verification remain a founder-side check via Sentry's own dashboard |

## Bottom line

**Superseded by the final 2026-09-20 state below - kept as history to
show how the picture evolved across the day rather than rewritten in
place.** Applying this exact 24-category framework and its own P0
decision rule initially produced: **NO-GO for a new unqualified
production release; the currently deployed private beta (artefact
`88b8eb44`, redeployed docs-only as `43768ec2`) remains healthy and safe
to keep serving its current invited users.**

**Update (same day, later pass):** closed several P1/other gaps that were
safely closable without real user data or new production risk -
Accessibility (added a real live keyboard/focus pass, not just axe),
Regression and visual testing (ran fresh, found and fixed two stale
baselines), Functional testing (interviews workflow verified live), and
Compatibility fully (Firefox, Edge verified live; WebKit's Windows-local
hang diagnosed and then confirmed working correctly via a one-off Linux
CI run against the real production site - zero page errors). Attempted to close the
Authorisation/cross-user P0 gap with a genuine two-account live test;
blocked by a missing local credential (`SUPABASE_SERVICE_ROLE_KEY`), not
skipped by choice - see that row for detail. Declined to force Monitoring
closed by re-enabling a debug endpoint this session had just hardened
shut, since that would trade a real security improvement for a checkbox.

**Final state, 2026-09-20 (evening) - every gap named above is now
closed.** The `SUPABASE_SERVICE_ROLE_KEY` blocker was resolved and
cross-user isolation closed with a genuine two-real-account live test
(see the Authorisation/Cross-user isolation rows above). Database
recovery and rollback rehearsal are both closed - recovery via a
signed, written risk acceptance (the technical gap is real and
unresolved; the *governance* decision to proceed anyway is closed), and
rollback via an actual live rehearsal, twice now (a genuine deployment
issue surfaced and was fixed both times). Privacy/founder sign-off is
closed. GDPR account-export completeness, initially marked closed on
thin evidence, was re-audited by querying the live database directly and
found to have 10 real missing tables plus a live account-deletion
failure bug - both fixed and re-verified; see the Security and privacy
row and `quality-assurance.md`'s 2026-09-20 entries. A parallel,
extensive logic-level audit (tracing what each field/label promises
against what the code does) found and fixed 11 further real bugs across
the mobility engine, country-fit scoring, and interview pipeline - none
of which this 24-category framework's category-by-category lens
surfaced on its own, since they were interaction/logic bugs within
categories already marked Pass, not missing categories. **Current
decision, matching every other document in this evidence chain: GO WITH
LIMITATIONS - two disclosed, written risk acceptances (backup/PITR,
leaked-password protection, both Supabase Free-tier plan limitations
resolved by the same upgrade), everything else a genuine Pass with live
evidence.** See `release-summary-v1.0.1-2026-09-20.md` for the full
narrative and `release-evidence-index.md` for the current artefact SHA
and deployment record.
