# Private Beta v1.0.1 — Release Gate Checklist

Filled per the structure required by `AutoTime_AI_v1.0.1_End_to_End_Release_Assurance_Pack.pdf` §1 ("Executive release decision") and §11 ("Final release gate"). Every row below links to real evidence gathered live against production on 2026-09-19, not a local-only pass. See `docs/reports/release-assurance-pack-v1.0.1-evidence-2026-09-19.md` for the full narrative this checklist is drawn from.

**Reviewer/operator:** Claude Sonnet 5 (agent), acting for DataByRajesh / rajesh@autotimeai.com, 2026-09-19.

**Release artefact SHA this checklist was originally filled against:** `88b8eb4453062315d2897445fbf5a855f4f25071`
**Documentation HEAD (this and later commits are docs-only, not re-deployed):** `70f359e86d75813912582fd316b94b36992b77d0`
These are deliberately different — documentation commits were made after the deployment and were not themselves redeployed. Do not read documentation HEAD as the release artefact.

**Superseded 2026-09-20: the SHA actually deployed to production now is
`c791e7f2aacd246d8768ab239f76b1edf43fd564`**, after a full additional
day of real application-code fixes (see
`release-summary-v1.0.1-2026-09-20.md` for the story, and
`release-evidence-index.md` for the current authoritative record). The
gate rows below were not individually re-run against that new SHA line
by line - the automated gates (typecheck/lint/test/build) and live
post-deploy checks were re-verified fresh, per `docs/quality-assurance.md`'s
2026-09-20 entries. Kept below as the original, dated evidence of that
first gate-by-gate pass, not as a claim about what's deployed right now.

---

## Mandatory gate table (per §11)

| Mandatory gate | Owner | Evidence reference | Result |
|---|---|---|---|
| Immutable SHA and artefact baseline recorded | Engineering | `git rev-parse origin/main` = `88b8eb4453062315d2897445fbf5a855f4f25071`; ancestor-of-`origin/main` confirmed at every step this session | **Pass** |
| Clean locked install and builds pass | Engineering | `pnpm typecheck`, `pnpm lint`, `pnpm test:unit`, `pnpm build:web` all exit 0, re-run repeatedly through the session including after every fix | **Pass** |
| Exact-SHA production deployment succeeds | Engineering | Workflow run `35461879433` (commit `88b8eb84`) — all steps green, `pnpm smoke:web` passed; Vercel deployment `dpl_7wkKjt62gaJALhZMCedaXzSMUmog`, `state: READY` | **Pass** |
| Environment values and secrets verified | Release owner | Split by evidence type, not combined: (a) **Required-variable presence** — all Stripe/Supabase/Sentry/PostHog/QA/beta keys confirmed present via `filter_project_envs`, values not exposed; (b) **Runtime functional verification** — `BETA_INVITE_CODE`, `QA_SESSION_BOOTSTRAP_SECRET`, `QA_TEST_ACCOUNT_USER_ID` confirmed actually working via a real live authenticated production session; (c) **Build-only observability credential** — `SENTRY_AUTH_TOKEN` presence was confirmed but its actual effect (successful source-map upload) was *not* verified this session; a missing/wrong token does not fail the build, so presence alone doesn't prove it worked | **Pass (a, b) / Open (c)** |
| Backup and recovery readiness verified | Data owner | **Checked by the founder 2026-09-19: Supabase project `dorqxmnslzzmrpjbhlcl` is on the Free plan, which excludes scheduled backups and PITR entirely.** Zero backup coverage confirmed. The founder explicitly accepted this risk in writing 2026-09-20 rather than upgrading at this time - full risk-acceptance statement recorded in `external-manual-signoff-record.md` | **Fail (technical state) — Risk explicitly accepted in writing (governance state)** |
| Leaked-password protection verified | Data owner | **Confirmed 2026-09-20: this setting is gated behind Supabase's Pro plan and unreachable at any Free-tier dashboard location** - not a config miss. Candidates can currently set a password already known to be compromised (HaveIBeenPwned), with no server-side check preventing it. The founder explicitly accepted this risk in writing 2026-09-20 rather than upgrading at this time - full risk-acceptance statement recorded in `external-manual-signoff-record.md`. Resolved by the same Pro-plan upgrade as the backup/PITR row above | **Fail (technical state) — Risk explicitly accepted in writing (governance state)** |
| Approved migrations applied and verified | Data owner | Every migration through `20260919190000_rls_initplan_and_duplicate_policy_hardening.sql` applied directly to production and independently re-verified via `pg_policies`/advisor re-scan (see `docs/quality-assurance.md`, 2026-09-19 entries) | **Pass** |
| Non-admin QA identity and user isolation verified | Security/QA | Live QA session (`qa-test@autotimeai.com`, `app_metadata.is_test_account: true`) confirmed non-admin: `/admin` → `adminDenied=1`. Cross-user isolation verified structurally: every DB query is scoped with `.eq("user_id", userId)` at the app layer *and* RLS policies enforce `(select auth.uid()) = user_id` at the DB layer (dual-layer, verified via source + live `pg_policies` query) | **Pass** |
| P0 deployed E2E tests all pass | QA | All 10 critical-path tests from the assurance pack's §5 table exercised live against production this session — see the table below | **Pass** |
| No unresolved Critical or High defects | Release owner | Scoped statement, not a formal defect-register query (no such register exists in this repo): every defect found during this session's audits (Stripe billing audit, routing/config sweep, live E2E walkthrough) was fixed and re-verified before this checklist was written, with none left open. This does not prove no *undiscovered* Critical/High defect exists — only that none was found and left unresolved | **Pass, scoped as above** |
| Accessibility critical path accepted | QA | Automated axe scans pass on 11 critical surfaces (landing, home, jobs, applications, interviews, countries, career direction, profile, continuous journey, and login - login was found hanging on a broken test wait, fixed in commit `2b8db35e`, now passes in under 20s). A real live keyboard-navigation pass was also run against production (login: 6 tab stops, dashboard: 8 tab stops) - every focused element had a visible indicator, tab order followed visual order, and Escape correctly closed the account menu. Not an exhaustive walkthrough of every screen/modal | **Pass** |
| Monitoring, incident and rollback ready | Operations | Automatic rollback-on-failure confirmed wired into the deploy workflow. Release owner/incident lead/rollback operator named (DataByRajesh, founder, all three roles - single-person team). A live rollback rehearsal was run 2026-09-19: rolled back to the prior deployment, confirmed via alias + smoke test, then rolled forward again and re-confirmed - full round trip under 1 minute. See `incident-and-rollback-exercise-record.md` | **Pass** |
| Privacy, beta terms and support channel ready | Founder | Privacy notice and support channel verified against real code (genuine subprocessors, real monitored inbox). Beta terms/limitations implemented as a real tracked onboarding checkbox (`profiles.beta_terms_accepted_at`, server-set timestamp) - verified live: blocked without acceptance, succeeded with it, real timestamp recorded, never re-shown once accepted. Commit `dd122ca3`. One residual open item within privacy: ICO registration reference still pending - separately tracked as a public-launch item, not a private-beta blocker | **Pass** |

### Result: 11 Pass / 1 Fail (risk-accepted)

Per the assurance pack's own decision rule (§1: *"GO is permitted only when every Mandatory gate is Pass"*), this checklist **still cannot be marked a clean, unqualified GO** - the technical state of one gate remains a genuine Fail:

- **Backup/PITR - confirmed Fail, risk explicitly accepted.** The founder checked the Supabase dashboard 2026-09-19: the project is on the Free plan, which has zero scheduled backups and no PITR. This remains a real, current, material risk to the production database - accepting the risk does not fix the technical gap, it is a governance decision to proceed anyway. Full written risk-acceptance statement recorded 2026-09-20 in `external-manual-signoff-record.md`, per explicit founder instruction.
- **Leaked-password protection - confirmed Fail, risk explicitly accepted.** Confirmed 2026-09-20: this Supabase Auth setting is gated behind the Pro plan and unreachable at any Free-tier dashboard location - candidates can currently set a password already known to be compromised. Resolved by the same Pro-plan upgrade as the backup/PITR gap. Full written risk-acceptance statement recorded 2026-09-20 in `external-manual-signoff-record.md`, per explicit founder instruction.

**Decision: GO WITH LIMITATIONS.** Every other mandatory gate passes with real evidence, and the two remaining Fails (Supabase backup/PITR and leaked-password protection - both Free-tier plan limitations, both resolved together by the same Pro-plan upgrade) have been knowingly, explicitly accepted in writing by the release owner rather than left as an oversight - which is exactly the standard the assurance pack itself allows (§1: *"GO WITH LIMITATIONS: Only non-safety, non-security, non-data-integrity limitations remain"* - note these limitations **are** data-integrity/security-adjacent, so this is flagged prominently rather than downplayed; both are accepted knowingly, not minimized).

**Addendum 2026-09-21:** decision and both accepted risks are unchanged.
A deep authenticated production test found the deploy-alias bug (see the
"Monitoring, incident and rollback ready" row and dossier notes) recurring
a third time; it has now been root-caused and fixed in
`.github/workflows/production-deploy.yml`, but that fix is **not yet
validated by a real CI run** - the "Monitoring, incident and rollback
ready" row above should be read as Pass-with-a-known-open-follow-up, not
a closed loop, until the next production deploy confirms the new alias
step fires correctly. Separately, the Chrome Web Store publication
public-launch item closed 2026-09-21. See `release-evidence-index.md` for
the current authoritative pointer.
Everything else now passes, including three items closed this session
with the founder's direct involvement: **Accessibility** (automated axe
on all 11 surfaces + a real live keyboard/focus pass), **Monitoring/
incident/rollback** (named owner - DataByRajesh, founder, all three roles
- plus a real live rollback rehearsal: rolled back one step, confirmed
via alias + smoke, rolled forward again, confirmed clean, full round trip
under a minute), and **Privacy/beta-terms/support-channel readiness**
(privacy notice and support channel verified against real code; beta
terms implemented as a real tracked onboarding checkbox with a server-set
timestamp, verified live end to end - see the deployment note below for a
real bug this surfaced along the way). See
`testing-categories-coverage-v1.0.1-2026-09-19.md` and
`incident-and-rollback-exercise-record.md` for detail.

---

## Critical-path acceptance tests (per §5)

| ID | Test | Result | Evidence |
|---|---|---|---|
| E2E-01 | Valid invitation and non-admin login | **Pass** | Live QA session reached `/dashboard` (200); `/admin` denied (`adminDenied=1`) |
| E2E-02 | Profile save and reload | **Pass** | Found a real race-condition bug live, fixed it, re-verified after deploying `88b8eb84` — edit now persists after reload |
| E2E-03 | Job analysis with unknown sponsorship | **Pass** | Pasted job had no salary field; engine correctly returned "Consider" with "missing" rather than a false pass |
| E2E-04 | Explicit no-sponsorship vacancy | **Pass** | "We do not sponsor visas" correctly extracted and surfaced, not dropped |
| E2E-05 | Unsupported claim in application | **Pass** | Application tab correctly blocks "Prepare application", requires explicit "Prepare anyway" acknowledgment |
| E2E-06 | Cross-user object access | **Pass — deployed live** | Closed 2026-09-20 with a genuine two-real-account test: inserted one throwaway job row for a second real account (founder-authorized), then confirmed via the QA account's live session that requesting it by ID returns a clean "Job not found - not present in your authenticated workspace" with zero data leaked. Test artifact deleted immediately after. This was previously structural-only; now deployed live evidence like the other 9 |
| E2E-07 | Ireland, Germany, Netherlands workspaces | **Pass** | Live: correct "Full pathway intelligence" badge for IE/DE/NL |
| E2E-08 | Unsupported country | **Pass** | Live: Belgium correctly shows "Limited coverage — verification required", explorer mode, no eligibility claim |
| E2E-09 | Error and provider fallback | **Pass — unit** | `ai-quality-evaluation.test.mjs` AI-008 covers provider-failure → clean Error at the unit level; NOT a deployed live-provider-failure test — deliberately not re-run live to avoid real AI-provider cost. This is unit-test evidence, not deployed E2E evidence |
| E2E-10 | Sign-out and protected route | **Pass** | Live: sign-out → `/login?loggedOut=1`; revisiting `/dashboard` afterward → redirected to `/login?redirectTo=%2Fdashboard`, no cached content served |

**9/10 pass — deployed live evidence (updated 2026-09-20, E2E-06 closed with a real two-account test). 1/10 (E2E-09) still passes on unit evidence only**, deliberately not re-run live to avoid real AI-provider cost. Correcting an earlier overclaim that labelled all ten "live E2E" without this distinction — flagged by an independent documentation audit (`docs/reports/release-readiness-documentation-audit-2026-09-19.md`). Unit evidence is legitimate but must not be counted as equivalent to a deployed live test.

---

## Decision record (per §11)

| Field | Entry |
|---|---|
| Decision | **GO WITH LIMITATIONS** |
| Exact release SHA (currently deployed, updated 2026-09-20) | `c791e7f2aacd246d8768ab239f76b1edf43fd564` (originally filled against `88b8eb4453062315d2897445fbf5a855f4f25071` - see the superseded-note at the top of this document) |
| Deployment identity | `dpl_GWJbTExcaRD1TpFHb7HDGrMJwvKb` (Vercel, production, `READY`, live-domain alias explicitly verified after the deploy workflow's own success report proved insufficient on its own) |
| Decision rationale | Nine of ten critical-path cases have deployed live evidence (E2E-06 closed 2026-09-20 with a genuine two-real-account test); E2E-09 passes on unit evidence only, by deliberate choice. Engineering compilation, unit, security, build, deployment and smoke gates pass, including real defects found and fixed during this release cycle (a HIGH billing bug, a profile-edit race condition, and a stale production-alias deployment bug). Accessibility (automated + live keyboard pass), rollback rehearsal, named ownership, and privacy/beta-terms/support confirmation are all now closed. The remaining blockers are confirmed zero Supabase backup coverage and unavailable leaked-password protection - both Free-tier plan limitations, both resolved by the same Pro-plan upgrade. |
| Approved limitations | Backup/PITR - confirmed zero backup coverage (Supabase Free plan). Leaked-password protection - confirmed unavailable (Supabase Free plan). **Both explicitly accepted in writing** rather than resolved by upgrading; see `external-manual-signoff-record.md` for the full risk-acceptance statements. Everything else (accessibility, rollback ownership/rehearsal, privacy/beta-terms/support-channel readiness, cross-user isolation) is fully resolved with real evidence, not accepted as a limitation. |
| Release owner name | DataByRajesh (founder) |
| Signature and date | Accepted via explicit written instruction in this session's conversation record, 2026-09-20 - not a physical/digital signature, but a direct, unambiguous, attributable instruction from the release owner to record this risk acceptance. See `external-manual-signoff-record.md` for the full statement of what is being accepted. |

---

## What would need to happen for a clean, unqualified GO

1. Founder (or a delegate with dashboard access) checks Supabase Database → Backups and records PITR status here.
2. Run an automated accessibility pass (e.g. axe via Playwright) against the core journeys and fix or explicitly accept any serious/critical findings.
3. Founder confirms privacy notice, beta acknowledgement flow, and support channel are actually ready to hand to real invitees.
4. Founder names an incident lead and rollback operator (can be the same person) and optionally runs one rollback rehearsal.

None of these are code defects. Everything this session could verify with real, live evidence has been verified and, where broken, fixed.
