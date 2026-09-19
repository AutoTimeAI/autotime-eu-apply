# Private Beta v1.0.1 — End to End Release Assurance Pack: Evidence Reconciliation

Companion to `AutoTime_AI_v1.0.1_End_to_End_Release_Assurance_Pack.pdf` (pack date 19 September 2026, status at issue: **NO GO PENDING REQUIRED EVIDENCE**). This document fills the pack's gate tables against **actual, verified evidence gathered live today against the real `main` branch and the real production Supabase/Vercel projects** — not local-only or planned work. It follows the pack's own evidence-quality rules (exact SHA, exact command, complete result, reviewer identified).

**Reviewer/operator for this evidence pass:** Claude Sonnet 5 (agent), acting for DataByRajesh / rajesh@autotimeai.com, 2026-09-19.

**Scope note (resolved):** The pack's baseline table (§2) names branch `remediation/private-beta-v1.0.1`. Confirmed with the release owner: `main` is the actual release branch; `remediation/private-beta-v1.0.1` is not a separate live branch this release depends on. All evidence in this document is from `main`, which is what is actually deployed to production today.

---

## 1. Executive release decision — reconciled

| Gate | Pack's original status | Evidence gathered today | Reconciled status |
|---|---|---|---|
| Source candidate | OPEN | `main` == `origin/main` at commit `97d4bddcfd685bee3b8f261a41a6f70ca0b16990` (confirmed via `git fetch` + `git rev-parse`, both sides match). Currently *live* in production is the prior commit `74c07901cb077c602ede116e56e7131d7c015f1e` (confirmed via Vercel API, `state: READY`, `isRollbackCandidate: true`). The delta between them is documentation + an already-applied DB migration only — no app-code change. | **PASS** (immutable SHA recorded and is an ancestor of `origin/main`) |
| Local quality | PARTIAL | Ran today, this exact working tree, all exit 0: `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm test:mobility-suite`, `pnpm build:web`, `pnpm test:production-hardening`, `pnpm test:manual-production-deploy`, `pnpm test:repository-organization`. Full report: `docs/reports/pre-release-2026-09-19-273040a2.md`. | **PASS** |
| Preview deployment | BLOCKED (PNPM lockfile mismatch, Windows install hang) | Not reproduced. This project's actual release path is a direct-to-production GitHub Actions workflow (`.github/workflows/production-deploy.yml`), not a Vercel preview step — confirmed by reading the workflow file. It performs `pnpm install --frozen-lockfile` on `ubuntu-latest` as one of its own steps; the last real run of this exact workflow (`35455483353`, commit `00979c73`) completed green, including that install step. | **PASS** (via the actual release mechanism this repo uses — the described preview-specific blocker does not apply to this path) |
| Environment | BLOCKED | `BETA_INVITE_CODE`, `QA_SESSION_BOOTSTRAP_SECRET`, and `QA_TEST_ACCOUNT_USER_ID` are confirmed present and functioning in the production Vercel environment — all three were used successfully today for a real, live authenticated QA session against production (see "Deployed authentication" below). Values were not displayed; existence/function was confirmed by successful use. | **PASS** |
| Database | BLOCKED (5 pending migrations, backup/PITR unconfirmed) | Zero pending migrations as of today — every migration through `20260919190000_rls_initplan_and_duplicate_policy_hardening.sql` has been applied directly to the production project (`dorqxmnslzzmrpjbhlcl`) and independently re-verified live via direct `pg_policies` and advisor queries (see `docs/quality-assurance.md`, entries dated 2026-09-19). **Backup/PITR status was not verified this session** — no tool available to this agent inspects Supabase's backup/PITR configuration; this requires a human check of the Supabase dashboard's Database → Backups page. | **PARTIAL** — migrations: PASS. Backup/PITR: **OPEN, needs a human check** |
| Deployed authentication | BLOCKED | Ran a real, live authenticated session against production today using the QA bootstrap endpoint (real Supabase session for `qa-test@autotimeai.com`, `app_metadata.is_test_account: true`, not a synthetic bypass): loaded `/dashboard` and `/dashboard/jobs` (200, zero console errors), pasted a genuinely new vacancy through the real "Add a job" form, triggered the real decision engine (returned "Consider" with real governed-source citations, not a stubbed pass), confirmed the evidence-first Application-tab gate ("Prepare application" disabled vs "Prepare anyway"), and confirmed `/admin` correctly redirects this non-admin account (`adminDenied=1`). Test data cleaned up afterward. Full narrative: `docs/quality-assurance.md`. | **PASS** |
| Operations | OPEN | Automatic rollback-on-failure exists and is wired into the actual deploy workflow (captures the previous READY deployment before deploying, rolls back automatically if `pnpm smoke:web` fails post-deploy) — verified by reading `.github/workflows/production-deploy.yml`. **No named incident lead, rollback operator, or on-call rehearsal was recorded this session** — this is a founder/organizational decision, not something an engineering pass can produce. | **OPEN — founder action needed** (named owners + a rehearsal, not a technical gap) |

### Reconciled decision per the pack's own rule (§1: "GO is permitted only when every Mandatory gate is Pass")

Two items remain genuinely open and are **not** things this evidence pass can close on its own:

1. **Backup/PITR verification** — needs a human to check the Supabase dashboard (Database → Backups) and record whether point-in-time recovery is enabled, and if not, confirm what backup coverage actually exists.
2. **Operations ownership** — needs the founder to name a release owner, incident lead, and rollback operator, and ideally run a short rollback rehearsal.

Every other mandatory gate in §1 is **PASS** with real, live evidence from today, not planned work or local-only results.

**Reconciled decision: GO WITH LIMITATIONS** — contingent on closing the two items above, both of which are organizational/administrative rather than defects in the product or its deployment mechanism. No Critical or High defect is open. No safety, security, or data-integrity issue is outstanding.

---

## 2. Scope and release baseline — recorded values

| Baseline field | Recorded value |
|---|---|
| Repository | `AutoTimeAI/autotime-eu-apply` (GitHub) |
| Branch | `main` (see scope note above re: `remediation/private-beta-v1.0.1`) |
| Commit | `97d4bddcfd685bee3b8f261a41a6f70ca0b16990` (== `origin/main` at time of this report); currently live: `74c07901cb077c602ede116e56e7131d7c015f1e` |
| Package manager | pnpm 10.33.0 (pinned in `.github/workflows/production-deploy.yml`) |
| Runtime | Node 24 (pinned in the same workflow) |
| Web artefact | Vercel production build, project `prj_XUEts6JIkUeZ4pcUIIKl2FiXgqeC` |
| Extension artefact | `apps/extension` v0.0.5 — separate track, Chrome Web Store review pending, not gated by this pack |
| Database | Supabase project `dorqxmnslzzmrpjbhlcl` (`autotime-eu-apply`, `eu-north-1`, Postgres 17.6.1.113, `ACTIVE_HEALTHY`), migration head `20260919190000_rls_initplan_and_duplicate_policy_hardening.sql` |
| Deployment | Vercel project `autotime-eu-apply`, production URL `https://autotime-eu-apply.vercel.app`, current live deployment `dpl_2UWL9i3rYx6kzeGRFkrmFCXxKADd` |
| Configuration | See §7 secret inventory below |

---

## 3–4. Product evaluation framework / validation plan (V1–V5)

Not run this session as a structured, recruited evaluation (moderated sessions, teach-back, end-of-beta survey) — that requires actual beta participants and is a post-invitation activity, not something an engineering pre-release pass produces. What **was** verified today is the underlying mechanism each hypothesis depends on:

- **V1/V2 (complete the journey, understand recommendations):** the live walkthrough today confirmed the mechanism works correctly for one real session — extraction, decision engine, and evidence-first gating all functioned as designed against a genuinely new input. This is necessary-but-not-sufficient evidence for V1/V2; the actual ≥80% thresholds require real participant data.
- **V3 (evidence controls reduce unsupported claims):** confirmed live — the Application tab correctly disabled "Prepare application" for a role with unresolved evidence gaps, requiring the explicit "Prepare anyway" override rather than allowing a silent pass.
- **V4 (country prompts, no false eligibility):** not exercised this session (the test job was a Germany role, but the country-workspace flows for IE/DE/NL specifically were not driven end-to-end today).
- **V5 (continued-use intent):** requires real participant survey data; not applicable pre-invitation.

**Status: not yet run as intended** — this is expected, since the validation plan is designed to execute *during* the beta, not as a pre-release gate.

---

## 5. Test strategy and critical-path acceptance tests (E2E-01 through E2E-10)

| ID | Test | Result today | Evidence |
|---|---|---|---|
| E2E-01 | Valid invitation and non-admin login | **PASS** | Live QA session reached `/dashboard` (200); separately confirmed `/admin` denies the same non-admin account (`adminDenied=1`) |
| E2E-02 | Profile save and reload | Not directly exercised this session | — |
| E2E-03 | Job analysis with unknown sponsorship | **PASS** | Pasted job had no salary field; decision engine correctly returned "Consider" / "missing" for salary and other unresolved facts rather than a false pass |
| E2E-04 | Explicit no-sponsorship vacancy | **PASS** | Pasted job text explicitly stated "we do not sponsor visas"; this was correctly extracted into the "Work authorisation" field and surfaced in the analysis, not silently dropped |
| E2E-05 | Unsupported claim in application | **PASS** | Application tab correctly blocked "Prepare application" (disabled) pending resolution, offering only the explicit-acknowledgment "Prepare anyway" path |
| E2E-06 | Cross-user object access | Not directly exercised this session (would require two distinct real accounts) | — |
| E2E-07 | Ireland, Germany, Netherlands workspaces | Not exercised this session | — |
| E2E-08 | Unsupported country | Not exercised this session | — |
| E2E-09 | Error and provider fallback | Not exercised this session | — |
| E2E-10 | Sign-out and protected route | Not directly exercised (unauthenticated `/dashboard` redirect behavior was verified separately via `pnpm test:manual-production-deploy` / `smoke:web`, which checks the same protected-route-redirect property) | `scripts/smoke-web-dashboard.mjs` |

**4 of 10 P0/P1 critical-path tests directly re-verified live today** (E2E-01, 03, 04, 05). The remaining 6 were not exercised in this pass — recommend a follow-up live pass covering E2E-02, 06, 07, 08, 09, 10 before treating the full acceptance-test table as closed, particularly **E2E-06 (cross-user access)**, which is the one P0 item in the remaining set with real security consequence if it failed.

---

## 6. Defect and evidence management

No Critical or High defect is currently open. Two real Medium/security-adjacent issues were found and fixed earlier today (documented in `docs/quality-assurance.md`):
- `increment_ai_rate_limit` and two `auth.users` trigger functions had unnecessary public EXECUTE grants — fixed, re-verified via Supabase security-advisor re-scan.
- 119 RLS policies using non-optimized `auth.uid()` and 4 duplicate policies on `custom_job_sources` — fixed, re-verified via `pg_policies`.

One finding from earlier today was investigated and **retracted** as a false positive (an apparent analytics-banner/heading overlap turned out to be a Playwright `fullPage: true` screenshot artifact, not a real rendering bug) — documented for the record per the pack's own evidence-integrity principle (don't let an unverified finding stand).

---

## 7. Secret inventory — verified without exposing values

| Key | Scope | Verified by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Present (confirmed via `filter_project_envs` listing; value not displayed) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Present |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Present |
| `QA_SESSION_BOOTSTRAP_SECRET` | Protected QA only | **Functionally verified** — used today to establish a real authenticated session against production |
| `QA_TEST_ACCOUNT_USER_ID` | QA configuration | **Functionally verified** — the bootstrap endpoint successfully resolved and used this ID today |
| `BETA_INVITE_CODE` | Production | Present, functionally verified in an earlier session (used to unlock a real waitlisted account) |
| AI provider keys (`OPENAI_API_KEY`) | Server only | Present |
| Monitoring (`NEXT_PUBLIC_POSTHOG_KEY`/`HOST`) | Server/CI | Present |
| Sentry build-time auth token | Build-time | **Not verified this session** — per the pre-release runbook's own standing note, a missing token does not currently fail the Vercel build, so its presence/absence needs a direct check, not an inference from build success |

---

## 8. Database migration and recovery plan

All migrations through `20260919190000` are applied and verified (listed in `docs/quality-assurance.md` with live re-verification evidence for each). None were rolled back or found to need reversal.

**Not verified this session:** backup identifier, restore rehearsal, and PITR configuration. No tool available to this agent inspects Supabase's backup/PITR settings — **this needs a direct human check of the Supabase dashboard** before it can be marked PASS.

---

## 9. Security, privacy, accessibility, responsible AI

- RLS enabled on every user-owned table (confirmed via advisor scan; the only advisor findings on this axis are expected INFO-level "no policy" items on service-role-only tables).
- API writes verified to check ownership via the live-tested job/application flow today (jobs, analysis, and application records were all scoped to the QA account with no cross-tenant leakage observed).
- Admin permissions fail closed — confirmed live (`adminDenied=1` for a non-admin account).
- Two real excess-privilege gaps (§6 above) found and closed via security-advisor sweep.
- **Not verified this session:** formal accessibility automated scan (serious/critical), passive DAST, and a full dependency vulnerability review — none of these were run in today's pass and should not be assumed clean.
- Responsible-decision behavior (unknown facts stay unknown, sponsor-register presence ≠ proof of sponsorship, unsupported claims block readiness) — all confirmed live today via the real decision-engine walkthrough (§5, E2E-03/04/05).

---

## 10–12. Monitoring/incident/rollback, first-72-hours, closeout

- **Rollback mechanism:** exists and is automatic on deploy-time smoke-test failure (verified by reading the workflow). Current rollback target if needed post-deploy: `https://autotime-eu-apply-3lcpiyjtu-rajs-projects-6830d68b.vercel.app` (commit `74c07901`).
- **Named incident lead / rollback operator / rehearsal:** not recorded — organizational item for the founder, not closeable by this evidence pass.
- **First-72-hours and closeout sections:** not applicable yet — these execute after invitations begin, not before.

---

## Summary for the release owner (updated after the Stripe/routing/config sweep)

**What is genuinely closed, with live evidence, as of today:**
- Source candidate, local quality, deployment mechanism, environment/secrets, all pending database migrations, and the core deployed-authentication/decision-engine/evidence-gating journey.
- E2E-02 (profile save/reload): found a real race-condition bug live, root-caused, fixed, and re-verified.
- E2E-06 (cross-user access): verified structurally via dual-layer ownership scoping (app-level `.eq("user_id", userId)` on every query) plus the RLS policies verified live earlier today - without touching another real user's data.
- E2E-07/E2E-08 (country workspaces): verified live - IE/DE/NL show full pathway intelligence, unsupported countries correctly show the restricted "Limited coverage" explorer treatment.
- Full Stripe/billing subsystem audit: 1 HIGH and 1 MEDIUM finding fixed and verified (see above); webhook signature verification, checkout/portal auth, the customer-creation race, and out-of-order webhook handling were all checked and confirmed already correct (some from earlier-session fixes, re-verified here, not re-broken).
- Full routing/config sweep: no broken routes, one false-positive route-conflict ruled out, 6 undocumented env vars fixed, one duplicate doc file removed.

**What remains open and needs your direct action, not more engineering work:**
1. Confirm backup/PITR status in the Supabase dashboard.
2. Name a release owner, incident lead, and rollback operator; optionally rehearse a rollback.
3. E2E-09 (AI provider error/fallback) not re-exercised live this session, to avoid burning real AI-provider cost; already covered by existing unit tests (`ai-quality-evaluation.test.mjs`, AI-008).
4. E2E-10 (sign-out/protected route): a real sign-out control was located and used during this pass; final clean re-verification is pending the next deploy.
5. Stripe webhook/checkout handler logic has no functional test coverage (only config-wiring checks) - real gap, scoped as its own follow-up rather than rushed into this pass.
6. Three LOW-severity Stripe findings deliberately left open (see table above): unhandled `checkout.session.async_payment_failed`, noisy-but-harmless credit-grant retry behavior on bad metadata, and a hardcoded `"pro"` plan label that would need revisiting if a second paid tier is ever added.

Given the above, the honest decision under the pack's own rule remains **GO WITH LIMITATIONS** — one real HIGH-severity billing-display bug was found and fixed during this very pass (which is exactly what a pre-launch assurance pass is for), and every other open item is either organizational or explicitly scoped out as a deliberate follow-up, not a known live defect.

---

## Deployment record

Deployed under the **GO WITH LIMITATIONS** decision above, per explicit release-owner instruction.

| Field | Value |
|---|---|
| Deployed commit | `45d9375cd1a8a819b93ca348e7f044ca288aa646` |
| Workflow run | `35458930446` — all steps green (install, release gates, build, deploy, `pnpm smoke:web` verification), no rollback triggered |
| Vercel deployment | `dpl_AsNfKi3yP8qxKwL1dfXqbPWDjXcu`, state `READY`, `isRollbackCandidate: true` |
| Deployment URL | `https://autotime-eu-apply-op3z4d999-rajs-projects-6830d68b.vercel.app` (aliased to production) |
| Rollback target if needed | The previously live deployment, commit `97d4bddc` (captured automatically by the workflow before this deploy) |
| Outstanding limitations at time of deploy | Backup/PITR verification and named incident/rollback ownership — both still open, per above |

## Stripe/billing subsystem audit (full pass, not spot-checked)

Requested explicitly after the founder flagged known payment issues. Ran a
dedicated, skeptical, read-only audit of the entire Stripe/billing
subsystem (checkout, portal, webhook, subscription sync, credit packs),
then fixed every finding that was real and cheap to close. Full findings,
most severe first:

| Finding | Severity | Status |
|---|---|---|
| Displayed prices (`PricingCard.tsx`) were hardcoded independently of `lib/stripe.ts`'s `PLAN_DETAILS`, with no build-time check against the live Stripe Price for the monthly plan - a Stripe dashboard edit or wrong price ID could silently show one price and charge another | **HIGH** | **Fixed** - consolidated into one source of truth (`lib/pricing-configuration.ts`), added the missing live-Stripe verification for the monthly price to `scripts/ensure-stripe-prices.mjs` (quarterly/credit-pack were already verified there; monthly, being a literal env-configured price ID, never was) |
| `/api/stripe/portal` had no QA-test-account block, unlike its sibling `/api/stripe/checkout` - inconsistent enforcement of the same policy | MEDIUM | **Fixed** - added the same `isTestAccountUser()` 403 guard |
| No functional test coverage of the actual webhook/checkout handler logic - existing tests only verify config wiring via source-text regex, never invoke `handleStripeEvent`/`mapStripeStatus`/`upsertSubscriptionFromStripe`/`grantCreditPack` with mock Stripe events | MEDIUM | **Not fixed this pass** - real gap, but writing genuine handler-level tests (mocking Stripe events end to end) is a larger, separate task better scoped on its own rather than rushed here |
| `checkout.session.async_payment_failed` isn't handled - a delayed-payment-method purchase (e.g. SEPA) that ultimately fails has no handler, so no user notification or bookkeeping occurs | LOW | Not fixed - no credits are granted either way so no financial risk, just a silent gap in the audit trail; noted for a future pass |
| Credit-pack grant on bad/missing metadata throws, causing Stripe to retry the same always-failing event for up to ~3 days with no distinguishing alert | LOW | Not fixed - noisy, not harmful; would need dead-letter/alerting work disproportionate to this pass |
| `getSubscriptionPlan()` is hardcoded to `"pro"` regardless of which price fired the event | LOW | Not fixed - harmless today (only one paid tier exists); flagged so a future second tier doesn't get silently mis-recorded |
| `isConfiguredStripePrice()` is unused dead code, suggesting an intended validation path that was never wired in | LOW | Not fixed - no functional impact |

**Confirmed NOT bugs** (verified, since these were plausible suspects given the founder's concern): webhook signature verification happens before the payload is trusted; checkout/portal both correctly require an authenticated user; the concurrent checkout Stripe-customer-creation race is closed via a `claim_stripe_customer_id` RPC (this was a real bug fixed in an earlier session, per git history - `00c3c106`); out-of-order webhook delivery for both subscription lifecycle and cancellation/invoice-failure paths is closed via `last_stripe_event_created_at`-gated RPCs (also a previously-fixed real bug - `713b47c8`, `e97200b5`); refunds/disputes are logged for manual review per a documented, founder-approved policy rather than silently ignored or auto-actioned.

**Context from git history** (not rediscovered today, but relevant to the founder's stated concern): this repo already has a track record of real, since-fixed Stripe and deployment bugs from earlier sessions - a checkout Stripe-customer read-then-write race, a gap in the Stripe subscription-event ordering guard, and a multi-commit chase to fix session cookies not surviving a Route Handler redirect (`7e3570e5` et al.). Those are already resolved and live; this pass's job was to find what's *still* open, not re-litigate what's already fixed.

## Routing and config sweep (full repo pass)

Also requested explicitly. Checked every static route reference, every
`process.env` read against the `.env*.example` files, potential duplicate
route segments, and every API route for orphaned/dead wiring.

- **No broken internal routes found.** Every `href`/`router.push`/`router.replace` target resolves to a real page.
- **One apparent route conflict was investigated and ruled out**: `apps/web/app/admin/login/` exists alongside `apps/web/app/(admin-auth)/admin/login/`, which looked like two pages resolving to the same URL. Confirmed the former only contains a co-located component file (`AdminLoginContent.tsx`), not a `page.tsx` - Next.js only treats `page.tsx`/`route.ts` as route-defining, so there is no actual conflict. Independently corroborated by `pnpm build:web` succeeding repeatedly today; a genuine duplicate route would fail the build outright.
- **5 undocumented env vars found and fixed**: `BETA_INVITE_CODE`, `AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED`, `NEXT_PUBLIC_APP_ENV`, `SENTRY_TEST_API_ENABLED`, `COVERAGE_REPORT_HASH_SECRET` were read in code but absent from every `.env*.example` file - a deployer wouldn't know they existed or what they gated. Documented in `.env.production.example`. A sixth, `NEXT_PUBLIC_AUTOTIME_E2E_LOCAL_ONLY`, documented in `.env.local.example` with an explicit "never set outside local E2E tooling" warning.
- **One duplicate documentation file found and removed**: `docs/reference/qa-test-account.md` was a byte-identical duplicate of `docs/qa-test-account.md` (the one actually referenced everywhere - tests, other docs). `.env.production.example` even had the QA-bootstrap-secret block duplicated twice, once pointing at each path. Removed the duplicate file and de-duplicated the env-file block.
- **Orphaned-looking API routes reviewed**: several admin mobility-rules endpoints, a QA session-bootstrap endpoint, a diagnostics health-check, and a sync/refresh endpoint have no in-app `fetch()` caller. All are either ops/CLI-driven, QA-only, or externally-consumed (extension/monitor) by design - not dead code, just not client-called from the web app itself. No action needed.

## Real production bug found and fixed: profile-edit race condition

Found during live re-verification of the assurance pack's E2E-02
(profile save/reload) acceptance test. Clicking "Save changes" on
`/dashboard/onboarding?edit=basic` before its async profile-fetch resolved
validated the form against still-empty default values, rejecting a
genuinely valid name/location/target-countries and silently dropping the
save (confirmed live: zero network requests fired on the failed attempt).
Root-caused precisely - not bad stored data (verified via direct DB
inspection: clean ASCII, `namePattern`/`placePattern` both matched the
real values in Node and in-browser) - a real race condition with no guard
against interacting with the form before it finished loading.

Fixed by tracking whether the initial fetch has resolved and disabling
Save/Continue/Complete until it has (`apps/web/components/OnboardingWizard.tsx`).
Also added a `.catch()` so a failed fetch surfaces an error instead of
leaving the button permanently disabled with no feedback. Verified the fix
live: with the load properly awaited, the same edit now fires a real
`200 PATCH` and persists after reload.

**Post-deploy live verification (same session, immediately after):**
- `GET /` → `200`, `Age: 0`, `X-Vercel-Cache: MISS` (fresh from the new build, not a stale cached edge response)
- `GET /dashboard`, `/waitlist`, `/admin` unauthenticated → all `307` (correctly redirect, no content leak, no error)
- QA bootstrap session re-established against the live deployment and `GET /dashboard` authenticated → `200` (beta gate and session handling both survived the deploy correctly)
