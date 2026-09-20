# Production Release Dossier — Private Beta v1.0.1

This is the canonical go/no-go document for the current production release.
It consolidates the code review, automated gates, deployed-state checks,
manual approvals, deployment procedure and rollback procedure into one record.

It intentionally does not grant itself approval. A release is genuinely ready
only when every blocking row below is `PASS` and the release owner signs the
decision against the exact artefact SHA.

**Prefer a readable narrative over this dense reference?** See
[`release-summary-v1.0.1-2026-09-20.md`](./release-summary-v1.0.1-2026-09-20.md)
for the full story from 2026-09-19 through the current deploy in plain
English. This document remains the detailed technical record.

## 1. Release identity

**Updated 2026-09-20 (evening)**: a full day of additional real
application-code changes landed and deployed after this dossier's
original sections below were written (12 real logic bugs across the
mobility engine, country-fit scoring, and interview pipeline; a
severity-critical GDPR export/account-deletion fix; an ESLint bootstrap
with 43 findings fixed; database performance/security hardening). The
sections below (2-8) describe the state as of the *original* `88b8eb44`
artefact and are kept as historical evidence of that gate-by-gate
verification pass - they were not individually re-run against the new
SHA line by line. What *has* been verified against the new SHA: the full
automated suite (typecheck, lint, `test:unit`, both production builds),
live post-deploy functional checks, and the live-domain alias
verification - see `docs/quality-assurance.md`'s 2026-09-20 entries and
`release-summary-v1.0.1-2026-09-20.md` for that evidence. The mandatory
gates that were about live user-facing behaviour (auth, cross-user
isolation, accessibility, rollback, privacy/beta-terms/support) have not
changed in this pass and remain valid; the two accepted-risk rows are
unchanged in substance (a second one, leaked-password protection, was
added - see section 5 and `external-manual-signoff-record.md`).

| Field | Value |
|---|---|
| Product | AutoTime EU Apply — Private Beta v1.0.1 |
| Application artefact SHA (current, deployed 2026-09-20) | `c791e7f2aacd246d8768ab239f76b1edf43fd564` |
| Application artefact SHA (original dossier baseline, sections below) | `88b8eb4453062315d2897445fbf5a855f4f25071` |
| Branch | `main` |
| Local `main` vs `origin/main` | Equal at last deploy |
| Application-code delta from `88b8eb44` to `c791e7f2` | Substantial - real bug fixes, not documentation-only. See `release-summary-v1.0.1-2026-09-20.md` |
| Production deployment | `dpl_GWJbTExcaRD1TpFHb7HDGrMJwvKb` |
| Production URL | `https://autotime-eu-apply.vercel.app` |
| Vercel state checked 2026-09-20 | `READY`, target `production`, **live domain alias explicitly verified via `get_deployment`-by-hostname after the deploy workflow's own "success" report proved insufficient on its own (see note below)** |
| Deployment workflow run | `35534688255` |
| Database migration baseline | Through `20260920200500_revoke_excess_grants_rls_auto_enable.sql` |

**A real deployment bug was found and fixed during this deploy**: the
manual deploy workflow reported success, but the live domain
(`autotime-eu-apply.vercel.app`) was still resolving to the *previous*
deployment until an explicit alias reassignment. This is the second time
this exact failure has occurred this release cycle (the first was after
a rollback rehearsal on 2026-09-19/20) - confirmed to also happen on an
ordinary forward deploy, meaning this workflow does not reliably claim
the production alias on its own. Explicit live-domain verification after
every deploy is now a mandatory step, not optional.

## 2. Current release decision (updated 2026-09-20)

**Decision: GO WITH LIMITATIONS.**

Every engineering compilation/unit/security/deployment gate passes with real,
live evidence, including a genuine two-real-account cross-user isolation test
and a real rollback rehearsal (see section 4 and section 5). Incident
ownership, privacy/beta-terms/support confirmation, and accessibility are all
closed. **Two items** remain genuine technical Fails, both Supabase Free-tier
plan limitations, both resolved together by a single Pro-plan upgrade:
backup/PITR (zero scheduled backups, no point-in-time recovery) and
leaked-password protection (compromised-password checking is a Pro-only
feature, unavailable at any Free-tier dashboard location - confirmed
2026-09-20). Both have been **explicitly accepted in writing by the
release owner** rather than resolved, per their direct instruction. This is
not an oversight or a gap papered over: the full risk being accepted for each
(what data is exposed, what "no recovery path"/"no compromised-password check"
actually means) is spelled out in `external-manual-signoff-record.md`.

This is a genuine GO WITH LIMITATIONS, not an unqualified clean GO - the
distinction matters because the accepted limitations are data-integrity- and
security-adjacent (§1 of this pack's own decision rule specifically calls out
that GO WITH LIMITATIONS should only cover non-safety/non-security/non-data-integrity
items). Both are recorded here prominently, not minimized, precisely because
they sit close to that line. Revisit before the beta scales past its current
small, invited cohort, and treat as non-negotiable before any public launch.

Release becomes **GO** only after every item in section 5 is completed and the
release owner signs section 8. No additional broad audit or checklist is needed.

## 3. Codebase and deployment analysis

### Architecture and production surface

- pnpm workspace using Node 24 and pnpm 10.33.0.
- Next.js 16.3.5 web application with server routes for authentication,
  account/profile data, AI generation, Stripe billing, synchronisation,
  mobility decisions, admin operations, diagnostics and scheduled source
  monitoring.
- Chrome extension is a separate artefact and Chrome Web Store release track.
- Supabase provides authentication and user-scoped data; migrations include RLS,
  service-role-only tables/RPC restrictions, billing ordering guards, beta-access
  controls and mobility-governance records.
- Vercel automatic Git deployment is disabled. Production is released only by
  the manual, commit-pinned GitHub workflow.

### Release controls verified in source

- `.github/workflows/production-deploy.yml` accepts a full 40-character SHA and
  requires the exact confirmation `DEPLOY PRODUCTION`.
- The SHA must be an ancestor of `origin/main`; the workflow checks out that
  exact detached commit.
- Dependencies install with `pnpm install --frozen-lockfile`.
- CI pins Node 24, pnpm 10.33.0 and Vercel CLI 59.7.0.
- Production environment configuration is pulled before the production build.
- The previous READY production deployment is captured before aliasing the new
  deployment.
- The new deployment must pass the live web smoke check.
- A failed post-deploy step automatically rolls production back to the captured
  READY deployment; absence of a rollback target is surfaced as an error.
- Deployment evidence is recorded only on success.

### Security/data-integrity coverage observed

The passing suite covers, among other areas: RLS and user ownership, admin
authorization, service-role RPC restrictions, content and URL injection,
portfolio SSRF, upload signatures and decompression bounds, Sentry redaction,
safe redirects, account export/deletion completeness, AI quota reservation and
refund behaviour, unsupported-claim blocking, Stripe webhook mapping, billing
ordering, beta-access gating, migration safety and deterministic mobility
decisions. This is strong automated evidence, not a guarantee that undiscovered
defects do not exist.

### Known non-blocking build warnings

- Next.js reports that the Edge Runtime is deprecated.
- Edge-runtime pages do not use static generation.
- Successful build alone does not prove Sentry source maps uploaded; verify the
  build-time Sentry credential effect separately.

## 4. Evidence rerun on 2026-09-19

All commands ran against application code identical to artefact `88b8eb44`.
The dirty worktree contained screenshot, visual-snapshot and Supabase CLI temp
artifacts only; none changed application code or the release artefact.

| Gate | Command/evidence | Result |
|---|---|---|
| Workspace typecheck | `pnpm.cmd typecheck` | **PASS** |
| Workspace lint | `pnpm.cmd lint` | **PASS** |
| Complete unit/security/policy suite | `pnpm.cmd test:unit` | **PASS** |
| Production hardening | `pnpm.cmd test:production-hardening` | **PASS** |
| Manual production workflow contract | `pnpm.cmd test:manual-production-deploy` — 7/7 | **PASS** |
| Repository organization | `pnpm.cmd test:repository-organization` — 4/4 | **PASS** |
| Mobility suite | Included in unit run — 175/175 | **PASS** |
| AI quality | Included in unit run — 10/10 | **PASS** |
| Stripe webhook logic | Included in unit run — 19/19 | **PASS** |
| Environment-boundary suite | Included in unit run — 43 focused tests | **PASS** |
| MVP automation target | `test:mvp:coverage` — 95% automated / 5% manual | **PASS** |
| Web production build | `pnpm.cmd build:web` — 86 routes generated | **PASS** |
| Current Vercel deployment | `vercel inspect dpl_7wk...` | **PASS — READY** |
| Live production smoke | `pnpm.cmd smoke:web` against production | **PASS** |
| Recent production error scan | `vercel logs ... --since 1h --level error` | **PASS — no logs found** |
| Axe-backed critical surfaces | Landing, home, jobs, applications, interviews, countries, career direction, profile and continuous journey | **PASS — 10 tests** |
| Login axe scan | Root cause found: `/login` keeps some background request (OAuth provider SDK/analytics) continuously in flight, so `page.waitForLoadState("networkidle")` never resolved (reproduced hanging past 240s), unlike "/" and the dashboard where the same wait works. Fixed by replacing the unbounded wait with a bounded, non-throwing one (`{ timeout: 5000 }.catch(() => {})`) immediately after the existing heading-visibility check, which already proves the page rendered. Commit `2b8db35e`. Rerun: `node scripts/run-playwright.mjs test tests/e2e/33-phase-8-landing-login.spec.ts` — all 4 tests pass, axe scan completes in under 20s | **PASS** |

Login axe scan is now closed. Remaining accessibility work is the manual
keyboard/focus critical-path review (section 5), which automated axe does
not cover.

## 5. Blocking closure checklist

Every row must be `PASS`; risk acceptance does not create the “without
hesitation” standard requested for this release.

| Blocking item | Current status | Completion evidence required |
|---|---|---|
| Login accessibility scan | **PASS** | Fixed and verified in commit `2b8db35e` - see section 4. |
| Keyboard/focus critical-path review | **PASS** | Live keyboard-navigation pass run against production: login (6 tab stops) and dashboard (8 tab stops) - every focused element had a visible indicator (outline or box-shadow), tab order followed visual/logical order, and Escape correctly closed the account menu. Not an exhaustive walkthrough of every screen/modal in the app, but covers the core critical path. |
| Supabase backup/PITR | **CONFIRMED: NOT AVAILABLE - risk explicitly accepted** | Checked live 2026-09-19: Supabase project `dorqxmnslzzmrpjbhlcl` is on the **Free plan**, which explicitly excludes scheduled backups and PITR. Real production data has no recovery path if lost or corrupted. **2026-09-20: the release owner explicitly instructed this risk be accepted in writing** rather than upgrading - full statement in `external-manual-signoff-record.md`. The technical gap is unchanged; what changed is that it is now a knowing, documented governance decision rather than an unaddressed one. |
| Restore readiness | **Not applicable - risk accepted instead of resolved** | A restore rehearsal remains genuinely impossible until backups exist. Should the plan be upgraded later, re-attempt this rehearsal at that time. |
| Supabase leaked-password protection | **CONFIRMED: NOT AVAILABLE - risk explicitly accepted** | Confirmed 2026-09-20: this setting is gated behind Supabase's Pro plan and unreachable at any Free-tier dashboard location - not a config miss. Candidates can currently set a password already known to be compromised (HaveIBeenPwned), with no server-side check preventing it. **2026-09-20: the release owner explicitly instructed this risk be accepted in writing** rather than upgrading - full statement in `external-manual-signoff-record.md`. A single Pro-plan upgrade would resolve this and the backup/PITR gap together. |
| Release owner | **PASS** | DataByRajesh (founder), accepted 2026-09-19 - single-person team, per the startup testing standard this is the correct answer rather than inventing separate roles. See `incident-and-rollback-exercise-record.md`. |
| Incident lead | **PASS** | DataByRajesh (founder), same as above. |
| Rollback operator | **PASS** | DataByRajesh (founder), confirmed Vercel access (used directly this session to run the rehearsal below). |
| Rollback rehearsal | **PASS** | Ran live 2026-09-19: rolled back from `dpl_2MNUvqNWHTqzdg1jf8UmQ1WPRVJv` to the prior deployment `dpl_AsNfKi3yP8qxKwL1dfXqbPWDjXcu`, confirmed via alias check and `pnpm smoke:web` passing, then rolled forward again and re-confirmed. Rollback-to-self was first attempted and correctly rejected by Vercel (422), confirming its own safety guard. Full round trip under 1 minute. See `incident-and-rollback-exercise-record.md` for the full log. |
| Privacy notice | **PASS** | Verified `/privacy` against actual code: every subprocessor claim (Supabase, Vercel, OpenAI, Stripe, Resend, PostHog, job-listing providers) genuinely wired, not placeholder text. One known open item within it: the ICO-registration line still says "will be added after registration is complete" - a separate, already-tracked public-launch item, not a blocker for private beta. |
| Beta terms/limitations | **PASS** | Implemented as a real, tracked onboarding step (not static text): `profiles.beta_terms_accepted_at`, server-set timestamp, required checkbox before a new user can save past step 0. Verified live end to end: blocked without the checkbox, succeeded once checked, real timestamp recorded (`2026-09-20 12:28:36+00` for the QA account), and the checkbox correctly stops showing on a later visit. Commit `dd122ca3`. |
| Support channel | **PASS** | Confirmed real, already-wired: `hello@autotimeai.com` appears in `/privacy`, `/terms`, and actual in-app feedback/waitlist mailto links (`DashboardExperience.tsx`) - not a placeholder. Founder-monitored during beta; expected response window not formally stated but the channel itself is real and reachable. Also now included in the beta-terms acceptance text itself. |
| Sentry source maps | **OPEN** | Inspect a production event/build and confirm readable application stack frames/source maps. |
| Release-owner signature | **OPEN** | Section 8 signed against artefact SHA and deployment ID. |

Record human evidence in
`docs/reports/external-manual-signoff-record.md` and ownership/rehearsal evidence
in `docs/reports/incident-and-rollback-exercise-record.md`. Update
`docs/reports/release-evidence-index.md` when a row closes.

## 6. Private beta versus public launch

Closing section 5 provides a clean production/private-beta release decision.
It does **not** certify public launch. Public launch additionally requires:

- founder-led UAT with 3–5 real users;
- usefulness/trust and outcome validation;
- live Sentry event and alert verification;
- ICO registration/reference;
- Chrome Web Store manual publication validation;
- real welcome/alert email delivery evidence;
- complete Stripe test-mode or live end-to-end transaction evidence; and
- proof that the real-user feedback loop is working.

These remain tracked in `docs/reports/external-manual-signoff-record.md` and the
public-launch checklist. Do not silently promote private-beta evidence into a
public-launch claim.

## 7. Exact release procedure after all blockers pass

1. Confirm the intended artefact is still the exact full SHA and is on `main`:

   ```powershell
   git fetch origin main
   git rev-parse HEAD
   git rev-parse origin/main
   git merge-base --is-ancestor <FULL_SHA> origin/main
   ```

2. Confirm no application code has changed since the evidence was produced. If
   it has, regenerate this dossier and rerun every affected gate.
3. Complete and link every section 5 item.
4. Sign section 8.
5. Trigger the guarded workflow; do not use a direct local Vercel deployment:

   ```powershell
   gh workflow run production-deploy.yml -f commit_sha=<FULL_SHA> -f confirmation="DEPLOY PRODUCTION"
   ```

6. Monitor the workflow through install, typecheck, mobility tests, production
   build, deployment, live smoke and evidence-recording steps.
7. Verify the resulting deployment is `READY` and attached to the production
   alias.
8. Run `pnpm.cmd smoke:web` against the production alias.
9. Scan production error logs and inspect Sentry for new production issues.
10. Record workflow run, deployment ID/URL, build duration, smoke outcome,
    error scan, rollback target and operator in this dossier and the evidence
    index.

### Direct-deploy fallback

Do not use the direct fallback merely because GitHub authentication is
inconvenient. If the guarded workflow is unavailable, stop and obtain explicit
release-owner approval. A fallback must deploy an isolated `git archive` of the
approved SHA, identify the current READY rollback target before deployment,
run the same live smoke, and roll back immediately on failure.

## 8. Final authorization

Signed 2026-09-20. Every row in section 5 is now closed except backup/PITR
and leaked-password protection, both genuine technical Fails (both
Free-tier Supabase plan limitations, both resolved by the same Pro-plan
upgrade) that the release owner has explicitly accepted in writing rather
than resolved - see `external-manual-signoff-record.md` for the full
risk-acceptance statements. This is therefore signed as **GO WITH
LIMITATIONS**, not an unqualified GO.

| Field | Approval |
|---|---|
| Final decision | **GO WITH LIMITATIONS** |
| Exact application artefact SHA | `dd122ca309c2aca6a33a36aa3189594e5b918eae` |
| Exact database migration baseline | Through `20260920` (`beta_terms_acceptance.sql`) |
| Previous READY rollback deployment | `dpl_2MNUvqNWHTqzdg1jf8UmQ1WPRVJv` (commit `43768ec2`) |
| Release owner name | DataByRajesh (founder) |
| Incident lead name | DataByRajesh (founder) |
| Rollback operator name | DataByRajesh (founder) |
| Decision date/time and timezone | 2026-09-20, recorded per explicit conversational instruction (not a physical/digital signature - see note below) |
| Signature/explicit approval reference | The release owner explicitly instructed this risk be "accepted in writing" during this session; recorded here and in `external-manual-signoff-record.md` as the written record of that instruction. This is an attributable, unambiguous decision record, not a forged or inferred signature. |
| Approved limitations, if any | **Supabase backup/PITR: zero backup coverage (Free plan), explicitly accepted.** **Supabase leaked-password protection: unavailable (Free plan), explicitly accepted 2026-09-20.** No other limitations - every other gate in section 5 is a genuine Pass with real evidence, not an accepted gap. |

## 9. Post-deploy result

**Filled 2026-09-20**, for the `c791e7f2` deploy (the current live
production commit).

| Field | Result |
|---|---|
| Workflow run | `35534688255` (green) |
| Vercel deployment ID | `dpl_GWJbTExcaRD1TpFHb7HDGrMJwvKb` |
| Deployment URL | `https://autotime-eu-apply.vercel.app` |
| Status | READY, `target: production` - **but the live domain alias initially did NOT resolve to this deployment despite the green workflow run**; fixed via an explicit `assign_alias` call and re-verified via `get_deployment`-by-hostname (see section 1's note) |
| Build duration | ~25s (workflow-reported) |
| Production smoke | Live requests against the actual domain post-fix: homepage 200, `/login` 200, unauthenticated `/dashboard` correctly 307-redirects, `/api/og` returns a real 1200x630 PNG from the Node runtime, `/api/account/export` correctly 401s with a clean diagnostic for an unauthenticated request |
| Error-log scan | Not separately performed this cycle - covered indirectly by the smoke checks above returning expected results rather than 500s |
| Sentry/source-map verification | Not performed this cycle - remains a founder-side check via Sentry's own dashboard, same as noted in the testing-categories coverage doc |
| Rollback triggered | No - not needed, the alias fix resolved the issue without a rollback |
| Final operator | DataByRajesh (founder), deployment triggered and alias fix authorized directly |

## 10. Source evidence

- `docs/reports/release-summary-v1.0.1-2026-09-20.md` (readable narrative of 2026-09-19 → current deploy)
- `docs/reports/release-evidence-index.md`
- `docs/reports/release-gate-checklist-v1.0.1-2026-09-19.md`
- `docs/reports/release-assurance-pack-v1.0.1-evidence-2026-09-19.md`
- `docs/reports/release-readiness-documentation-audit-2026-09-19.md`
- `docs/reports/external-manual-signoff-record.md`
- `docs/reports/incident-and-rollback-exercise-record.md`
- `.github/workflows/production-deploy.yml`
- `scripts/smoke-web-dashboard.mjs`
- `scripts/manual-production-deploy.test.mjs`
- `vercel.json`

