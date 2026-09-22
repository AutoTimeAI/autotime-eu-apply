# Release Evidence Index

Canonical map of release version → artefact → evidence, so an older report
can never be mistaken for current truth. Created per the recommendation in
`docs/reports/release-readiness-documentation-audit-2026-09-19.md`. Update
this file whenever a new release cycle starts or a canonical evidence
document changes — this page, not any individual report, is the entry
point for "what is the current release status."

**New to this release, or just want the story instead of a table?** Start
with [`release-summary-v1.0.1-2026-09-20.md`](./release-summary-v1.0.1-2026-09-20.md)
- a plain-English narrative of everything from 2026-09-19 through the
current deploy, written for a human to read once instead of cross-referencing
eight documents. This page stays the authoritative technical index; that one
is the readable front door.

## ⚠ Active, accepted risk: zero database backup coverage

Confirmed 2026-09-19 by the founder checking the Supabase dashboard directly: project `dorqxmnslzzmrpjbhlcl` is on the **Free plan**, which has no scheduled backups and no point-in-time recovery. This is not a documentation gap - it is a live, current fact about production. If the database is lost or corrupted right now, **there is no way to restore it.**

**2026-09-20: the release owner explicitly instructed this risk be accepted in writing** rather than upgrading the plan at this time. Full risk-acceptance statement in `external-manual-signoff-record.md`. The technical fact hasn't changed - this callout stays here, not because it's still an open question, but because an accepted risk this close to data-integrity should stay visible, not disappear from view once "resolved" on paper. Revisit before scaling past the current small invited cohort, and treat as non-negotiable before any public launch.

## ⚠ Active, accepted risk: no leaked-password protection (Free-tier gate, not a toggle)

Confirmed 2026-09-20 by the founder: Supabase's leaked-password protection (checks new/changed passwords against HaveIBeenPwned before accepting them) is **gated behind the Pro plan and unavailable at any Free-tier dashboard location** - not a setting that was simply hard to find. This project runs on the Free plan (same plan as the backup/PITR gap above). A candidate can currently set a password already known to be compromised, with no server-side check preventing it.

**2026-09-20 (same day): the release owner explicitly instructed this risk be accepted in writing** rather than upgrading the plan at this time, the same as the backup/PITR gap. Full risk-acceptance statement in `external-manual-signoff-record.md`. Same category as the backup/PITR risk: a real, current, plan-tier-gated gap, not a documentation or configuration miss - and notably, a single Supabase Pro upgrade would resolve both open Free-tier gaps at once. Revisit alongside the backup/PITR decision before scaling past the current small invited cohort.

## Current release cycle: Private Beta v1.0.1

Start with [`production-release-dossier-v1.0.1-2026-09-19.md`](./production-release-dossier-v1.0.1-2026-09-19.md).
It is the canonical consolidated go/no-go record. The documents below provide
the supporting detail. **Note (2026-09-21): the dossier and gate-checklist
files below are still dated 2026-09-19/20 and have not been re-issued to
reflect the 2026-09-21 activity in this table - treat this index and
`docs/quality-assurance.md` as current for anything after 2026-09-20, and
the dossier/checklist as current for everything up to that point.**

| Field | Value |
|---|---|
| Deployed SHA | `e3b7c6b1ac3a2a88464755feb1e08731873306d5` (deployed 2026-09-22, run `35752891873` - docs-only commit; app code unchanged since `023ad6db`) |
| Production deployment ID | See run `35752891873` evidence; live-verified via direct HTTP checks 2026-09-22 |
| Deployment workflow run | `35752891873` (green, alias-claim step passed). **Note**: the first attempt to deploy this commit (run `35752710965`) failed at the authorization step with `fatal: Not a valid commit name` - the commit existed locally but had not actually been pushed to `origin/main` yet. Pushed, then redeployed successfully. Production was never at risk (the failed run never reached the build/deploy steps) - confirmed via an immediate live smoke check before investigating |
| Documentation HEAD (may be later - docs-only commits) | see `git rev-parse origin/main` |
| Current decision | **GO WITH LIMITATIONS.** Every mandatory gate passes with real evidence except backup/PITR and leaked-password protection, both genuine technical Fails explicitly accepted in writing by the release owner (see risk callouts above - both are the same Supabase Free-tier plan limitation, resolved together by one Pro-plan upgrade). |
| Decision date | 2026-09-20 |
| Latest re-verification | 2026-09-20: **the exact same stale-alias deployment bug from the prior cycle recurred** - the manual deploy workflow reported success (green run, `READY`/`target: production` deployment created) but the live domain `autotime-eu-apply.vercel.app` was still serving the *previous* deployment (`dd122ca3`) until explicitly checked via `get_deployment` by hostname and fixed with a direct alias reassignment. Re-verified via `get_deployment` (now resolves to `c791e7f2`) and a live smoke check (homepage 200, login 200, unauthenticated `/dashboard` correctly 307s). This confirms the workflow's own "deploy succeeded" signal is not sufficient evidence on its own - explicit alias verification by hostname is now a required step, not optional, every time |
| 2026-09-21 follow-up | A deep authenticated live-production pass via a real QA test account hit **the same alias bug a third time**, ruling out any single trigger scenario. Root-caused: the deploy path uses the Vercel CLI with a bare API token (not Git-integration deploys), which does not reliably auto-claim the default `autotime-eu-apply.vercel.app` subdomain alias. **Fixed at the source** in `.github/workflows/production-deploy.yml` - a new step explicitly runs `vercel alias set` and independently verifies via `vercel inspect --json` that the domain's resolved deployment ID matches the run's, failing (and triggering rollback) on any mismatch. Also on 2026-09-21: the browser extension was published to the Chrome Web Store (see quality-assurance.md 2026-09-21 entry) |
| 2026-09-22 validation | **Alias fix now validated by a real deploy.** Separately, CI had been failing on every push since 2026-09-20 (`Enforce Vercel server trace budget`: the OG route's Edge-runtime deprecation cleanup moved `next/og`'s Satori/resvg renderer and Next's bundled `sharp` onto the Node server trace for the first time, pushing the real total from ~20 MiB to ~36.8 MiB) - fixed by deliberately raising the budget to 42 MiB (commit `023ad6db`, reasoning documented in `scripts/server-trace-budget.mjs`). CI green again, then production deploy run `35715668199` triggered on that commit: the **"Claim and verify the production domain alias" step ran for the first time and passed** - the stale-alias bug did not recur. Confirmed independently via live HTTP checks: homepage `200`, login `200`, unauthenticated `/dashboard` correctly `307`. Both the deploy-workflow fix and the CI blocker are now closed with real evidence, not just reviewed code |
| Release owner sign-off | **Signed 2026-09-20** - DataByRajesh (founder), GO WITH LIMITATIONS, per §8 of the production dossier |

## Canonical documents (read these; treat everything else as historical)

| Purpose | Document | Status |
|---|---|---|
| Consolidated production go/no-go dossier | [`production-release-dossier-v1.0.1-2026-09-19.md`](./production-release-dossier-v1.0.1-2026-09-19.md) | **Canonical entry point — current** |
| Complete version/dependency lock (modules, tools, libraries, SHAs) | [`production-version-lock-2026-09-22.md`](./production-version-lock-2026-09-22.md) | Current - regenerate as a new dated file on meaningful dependency/infra changes, don't overwrite |
| Mandatory gate table + decision record | [`release-gate-checklist-v1.0.1-2026-09-19.md`](./release-gate-checklist-v1.0.1-2026-09-19.md) | Current - update after every remaining gate closes |
| Detailed narrative evidence | [`release-assurance-pack-v1.0.1-evidence-2026-09-19.md`](./release-assurance-pack-v1.0.1-evidence-2026-09-19.md) | Current, but read the gate checklist first for the authoritative pass/fail state |
| Documentation audit (meta) | [`release-readiness-documentation-audit-2026-09-19.md`](./release-readiness-documentation-audit-2026-09-19.md) | Current - explains why the two documents above exist and what corrections were applied |
| Operational procedure for future releases | [`../reference/claude-code-pre-release-runbook.md`](../reference/claude-code-pre-release-runbook.md) + `.github/workflows/production-deploy.yml` | Procedure, not evidence a specific release passed |
| Public-launch gate (separate, stricter bar) | [`../reference/testing/public-launch-gate-checklist.md`](../reference/testing/public-launch-gate-checklist.md) | Needs refresh from August evidence - do not treat as current without checking dates inside it |
| Right-sized day-to-day testing bar | [`../reference/startup-test-validation-standard.md`](../reference/startup-test-validation-standard.md) | Current - defines what "properly tested" means for routine private-beta releases vs. the heavier dossier/pack, and when to escalate |
| 24-category testing coverage map + P0/P1/P2 priority | [`testing-categories-coverage-v1.0.1-2026-09-19.md`](./testing-categories-coverage-v1.0.1-2026-09-19.md) | Current - same underlying evidence as the dossier, organized by testing category instead of by gate |

## Mandatory gates still open (v1.0.1)

See the gate checklist for full detail. Summary:

| Gate | Status |
|---|---|
| Supabase backup/PITR | **FAIL (technical) - Risk explicitly accepted in writing (governance) 2026-09-20.** Founder checked the dashboard 2026-09-19: project is on Supabase's Free plan, which excludes scheduled backups and PITR entirely. Real production data has no recovery path right now - that fact is unchanged; the founder chose to proceed anyway rather than upgrade, in writing, per `external-manual-signoff-record.md` |
| Supabase leaked-password protection | **FAIL (technical) - Risk explicitly accepted in writing (governance) 2026-09-20.** Confirmed the same day: this setting is gated behind Supabase's Pro plan and unreachable at any Free-tier dashboard location - not a config miss. Candidates can currently set a password already known to be compromised; the founder chose to proceed anyway rather than upgrade, in writing, per `external-manual-signoff-record.md`. A single Pro-plan upgrade would resolve this and the backup/PITR gap together |
| Accessibility (automated axe + live keyboard/focus pass) | Closed - axe passes on all 11 covered critical surfaces including login; a real live keyboard-navigation pass (tab order, focus visibility, Escape behavior) was also run against production |
| Named incident lead / rollback operator | Closed - DataByRajesh (founder) named as release owner, incident lead, and rollback operator |
| Rollback rehearsal | Closed - ran live 2026-09-19, rolled back one step and forward again, confirmed via alias checks and `pnpm smoke:web` at each step, full round trip under 1 minute |
| Founder privacy/beta-terms/support confirmation | Closed - privacy/support verified against real code; beta terms implemented as a real tracked onboarding checkbox (`profiles.beta_terms_accepted_at`), verified live end to end |
| Cross-user isolation (E2E-06) | Closed 2026-09-20 - previously structural-only evidence, now a genuine deployed two-real-account test: a throwaway job row for a founder-authorized second real account was correctly denied when requested via the QA account's live session, zero data leaked |
| Release-owner signature | Closed - signed 2026-09-20, GO WITH LIMITATIONS, per §8 of the production dossier |

## Public-launch gates (separate, stricter bar - not required for private beta)

Not evaluated as blocking this private-beta cycle, but block any move to a
public launch. See the documentation audit's "Public-launch work not
started or not completed" table for the full list: founder-led UAT (3-5
users), outcome usefulness/trust validation, live Sentry event/alert
verification, ICO registration, real email delivery evidence, and a real
(test-mode or live) Stripe end-to-end transaction.

**Closed 2026-09-21:** the Chrome Web Store publication pass - the browser
extension is now live in the store (see `docs/quality-assurance.md`,
"2026-09-21: browser extension published to the Chrome Web Store").

## Superseded / historical documents

The following documents describe earlier release cycles or earlier
checkpoints within this same cycle. They are retained for history but must
not be read as current status. Each should carry (or should be given) a
banner pointing back to this index:

- `docs/reference/testing/release-gate-checklist.md` - May private-beta snapshot
- `docs/reference/testing/readiness-status-table.md` - August snapshot
- `docs/reference/testing/private-beta-v1-readiness-report.md`, `final-qa-report.md`, `qa-verification-report.md`, `e2e-run-verification-report.md`, `private-beta-v1-flaw-closure-report.md` - overlapping earlier readiness summaries
- `docs/reports/founder-validation-runs/*` - many contain `Pending`/`Not run`; treat as abandoned/incomplete unless explicitly closed
- `docs/reports/release-runs/*` - automated-only reports; manual checks they leave pending are not closed just because the automated part is

## How to use this page

1. Before trusting any release-status claim in this repo, check this index first for the current artefact SHA and canonical documents.
2. When a gate closes, update the gate checklist directly and update the "Mandatory gates still open" table here to match.
3. When a new release cycle begins, add a new dated section above this one (do not overwrite it) and move the old cycle's row into a short history table below.

## History

| Cycle | Artefact SHA | Decision | Date |
|---|---|---|---|
| Private Beta v1.0.1 (initial dossier) | `88b8eb4453062315d2897445fbf5a855f4f25071` | NO-GO for unqualified GO / deployed beta healthy | 2026-09-19 |
| Private Beta v1.0.1 (docs-only redeploy + re-verification) | `43768ec22c0f08fcc81ab95a7ad6d69747efdac5` | Same decision, re-confirmed clean via the startup beta-milestone bar | 2026-09-19 |
| Private Beta v1.0.1 (rollback rehearsal + named owners) | `43768ec22c0f08fcc81ab95a7ad6d69747efdac5` | Rollback rehearsal run live and passed; named owners recorded | 2026-09-19 |
| Private Beta v1.0.1 (beta-terms acceptance feature) | `dd122ca309c2aca6a33a36aa3189594e5b918eae` | NO-GO for unqualified GO; only remaining blocker is confirmed zero backup coverage | 2026-09-20 |
| Private Beta v1.0.1 (cross-user isolation closed; risk accepted; signed) | `dd122ca309c2aca6a33a36aa3189594e5b918eae` | **GO WITH LIMITATIONS - signed** | 2026-09-20 |
| Private Beta v1.0.1 (full scrutiny pass: 12 real bugs, GDPR fixes, ESLint bootstrap, DB hardening, second risk accepted) | `c791e7f2aacd246d8768ab239f76b1edf43fd564` | **GO WITH LIMITATIONS - signed** (two accepted risks, one Pro-plan upgrade resolves both) | 2026-09-20 |
| Private Beta v1.0.1 (3rd stale-alias occurrence found and fixed at the source; Chrome Web Store extension published) | `86f5dd40684475f51a52845b35faf36a79b01235` (docs + deploy-workflow fix only - no app-code redeploy) | Decision unchanged: **GO WITH LIMITATIONS**. Deploy-workflow fix reviewed and command-verified but not yet exercised by a real CI run - treat as unvalidated until the next production deploy confirms the alias step fires correctly | 2026-09-21 |
