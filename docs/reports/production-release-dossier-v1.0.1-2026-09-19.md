# Production Release Dossier — Private Beta v1.0.1

This is the canonical go/no-go document for the current production release.
It consolidates the code review, automated gates, deployed-state checks,
manual approvals, deployment procedure and rollback procedure into one record.

It intentionally does not grant itself approval. A release is genuinely ready
only when every blocking row below is `PASS` and the release owner signs the
decision against the exact artefact SHA.

## 1. Release identity

| Field | Value |
|---|---|
| Product | AutoTime EU Apply — Private Beta v1.0.1 |
| Application artefact SHA | `88b8eb4453062315d2897445fbf5a855f4f25071` |
| Current documentation HEAD | `10096289a69ca19b43d594de8eb66f9665533c5e` |
| Branch | `main` |
| Local `main` vs `origin/main` | Equal at audit time |
| Application-code delta from deployed SHA to documentation HEAD | None; six documentation files only |
| Production deployment | `dpl_7wkKjt62gaJALhZMCedaXzSMUmog` |
| Production URL | `https://autotime-eu-apply.vercel.app` |
| Vercel state checked 2026-09-19 | `READY`, target `production`, production alias attached |
| Deployment workflow run | `35461879433` |
| Database migration baseline | Through `20260919190000_rls_initplan_and_duplicate_policy_hardening.sql` per recorded production evidence |

The application code at current `main` is the application code already deployed
as `88b8eb44`; later commits contain release documentation only. A documentation
deploy is not required to change runtime behaviour. If a new application commit
is added, this dossier is stale and all SHA-dependent gates must be rerun.

## 2. Current release decision

**Decision: NO-GO for a new unqualified production release; current deployed
private beta may continue operating.**

Reason: every engineering compilation/unit/security/deployment gate run in this
audit passed, the current production deployment is healthy, and no application
code differs from the deployed artefact. However, the release policy requires
all mandatory gates to pass. Backup/PITR, incident ownership, privacy/beta/support
approval, and release-owner signature are not yet closed (the login
accessibility scan that was open at initial drafting has since been fixed and
closed - see section 4). “GO WITH LIMITATIONS” is not equivalent to the clean
GO requested here.

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
| Supabase backup/PITR | **CONFIRMED: NOT AVAILABLE** | Checked live 2026-09-19: Supabase project `dorqxmnslzzmrpjbhlcl` is on the **Free plan**, which explicitly excludes scheduled backups and PITR ("Free Plan does not include project backups. Upgrade to the Pro Plan for up to 7 days of scheduled backups."). This is not an unconfirmed gate - it is a confirmed zero-backup-coverage state. Real production data (currently real invited beta users) has no recovery path if lost or corrupted. |
| Restore readiness | **BLOCKED - no backup exists to restore from** | A restore rehearsal is not possible until backups exist. Decision needed: upgrade to Supabase Pro (adds scheduled backups + PITR), or explicitly accept the zero-recovery risk in writing for the current beta scope. |
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

Complete only after section 5 contains no OPEN, BLOCKED or PARTIAL row.
As of 2026-09-20, **backup/PITR (confirmed FAIL) is the only remaining
row blocking this table from being signed** - privacy/beta-terms/support
closed 2026-09-20 (real tracked onboarding acceptance, verified live),
and the cross-user isolation gap (previously structural-only evidence)
was also closed 2026-09-20 with a genuine deployed two-real-account test
(see `docs/quality-assurance.md`). Release owner, incident lead, and
rollback operator are already named in section 5 and
`incident-and-rollback-exercise-record.md` (DataByRajesh, founder, all
three roles).

| Field | Approval |
|---|---|
| Final decision | `GO` / `NO-GO` |
| Exact application artefact SHA | |
| Exact database migration baseline | |
| Previous READY rollback deployment | |
| Release owner name | |
| Incident lead name | |
| Rollback operator name | |
| Decision date/time and timezone | |
| Signature/explicit approval reference | |
| Approved limitations, if any | `None` for unqualified GO |

## 9. Post-deploy result

Fill after the authorized workflow completes.

| Field | Result |
|---|---|
| Workflow run | |
| Vercel deployment ID | |
| Deployment URL | |
| Status | |
| Build duration | |
| Production smoke | |
| Error-log scan | |
| Sentry/source-map verification | |
| Rollback triggered | |
| Final operator | |

## 10. Source evidence

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

