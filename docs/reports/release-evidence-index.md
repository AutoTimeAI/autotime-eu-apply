# Release Evidence Index

Canonical map of release version → artefact → evidence, so an older report
can never be mistaken for current truth. Created per the recommendation in
`docs/reports/release-readiness-documentation-audit-2026-09-19.md`. Update
this file whenever a new release cycle starts or a canonical evidence
document changes — this page, not any individual report, is the entry
point for "what is the current release status."

## ⚠ Active, accepted risk: zero database backup coverage

Confirmed 2026-09-19 by the founder checking the Supabase dashboard directly: project `dorqxmnslzzmrpjbhlcl` is on the **Free plan**, which has no scheduled backups and no point-in-time recovery. This is not a documentation gap - it is a live, current fact about production. If the database is lost or corrupted right now, **there is no way to restore it.**

**2026-09-20: the release owner explicitly instructed this risk be accepted in writing** rather than upgrading the plan at this time. Full risk-acceptance statement in `external-manual-signoff-record.md`. The technical fact hasn't changed - this callout stays here, not because it's still an open question, but because an accepted risk this close to data-integrity should stay visible, not disappear from view once "resolved" on paper. Revisit before scaling past the current small invited cohort, and treat as non-negotiable before any public launch.

## ⚠ Active, accepted risk: no leaked-password protection (Free-tier gate, not a toggle)

Confirmed 2026-09-20 by the founder: Supabase's leaked-password protection (checks new/changed passwords against HaveIBeenPwned before accepting them) is **gated behind the Pro plan and unavailable at any Free-tier dashboard location** - not a setting that was simply hard to find. This project runs on the Free plan (same plan as the backup/PITR gap above). A candidate can currently set a password already known to be compromised, with no server-side check preventing it.

Same category as the backup/PITR risk: a real, current, plan-tier-gated gap, not a documentation or configuration miss. No written risk-acceptance has been recorded for this one yet - flagging here so it doesn't quietly stay unaddressed. Revisit alongside the backup/PITR decision before scaling past the current small invited cohort.

## Current release cycle: Private Beta v1.0.1

Start with [`production-release-dossier-v1.0.1-2026-09-19.md`](./production-release-dossier-v1.0.1-2026-09-19.md).
It is the canonical consolidated go/no-go record. The documents below provide
the supporting detail.

| Field | Value |
|---|---|
| Deployed SHA | `dd122ca309c2aca6a33a36aa3189594e5b918eae` (adds the beta-terms acceptance feature) |
| Production deployment ID | `dpl_TU4JzVKaoVyfGrT2bL4Eq3hmj7Xp` (Vercel, `READY`) |
| Deployment workflow run | `35474963453` (green) |
| Documentation HEAD (may be later - docs-only commits) | see `git rev-parse origin/main` |
| Current decision | **GO WITH LIMITATIONS.** Every mandatory gate passes with real evidence except backup/PITR, which remains a genuine technical Fail explicitly accepted in writing by the release owner (see risk callout above). |
| Decision date | 2026-09-20 |
| Latest re-verification | 2026-09-20: beta-terms acceptance feature verified live end to end; cross-user isolation closed with a genuine two-real-account test (previously structural only). Found and fixed a real deployment bug along the way - see `docs/quality-assurance.md`'s 2026-09-20 entries: the production domain alias hadn't been reclaimed by the deploy after an earlier rollback rehearsal, silently serving a stale build despite the workflow reporting success. Fixed via a direct alias reassignment and fully re-verified |
| Release owner sign-off | **Signed 2026-09-20** - DataByRajesh (founder), GO WITH LIMITATIONS, per §8 of the production dossier |

## Canonical documents (read these; treat everything else as historical)

| Purpose | Document | Status |
|---|---|---|
| Consolidated production go/no-go dossier | [`production-release-dossier-v1.0.1-2026-09-19.md`](./production-release-dossier-v1.0.1-2026-09-19.md) | **Canonical entry point — current** |
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
verification, ICO registration, a manual Chrome Web Store publication
pass, real email delivery evidence, and a real (test-mode or live) Stripe
end-to-end transaction.

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
