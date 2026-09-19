# Release Evidence Index

Canonical map of release version → artefact → evidence, so an older report
can never be mistaken for current truth. Created per the recommendation in
`docs/reports/release-readiness-documentation-audit-2026-09-19.md`. Update
this file whenever a new release cycle starts or a canonical evidence
document changes — this page, not any individual report, is the entry
point for "what is the current release status."

## Current release cycle: Private Beta v1.0.1

Start with [`production-release-dossier-v1.0.1-2026-09-19.md`](./production-release-dossier-v1.0.1-2026-09-19.md).
It is the canonical consolidated go/no-go record. The documents below provide
the supporting detail.

| Field | Value |
|---|---|
| Release artefact SHA (deployed to production) | `88b8eb4453062315d2897445fbf5a855f4f25071` |
| Production deployment ID | `dpl_7wkKjt62gaJALhZMCedaXzSMUmog` (Vercel, `READY`) |
| Deployment workflow run | `35461879433` (green) |
| Documentation HEAD (may be later - docs-only commits) | see `git rev-parse origin/main` |
| Current decision | **NO-GO for a new unqualified release; current deployed private beta is healthy** |
| Decision date | 2026-09-19 |
| Release owner sign-off | **Pending** - not yet signed by the founder |

## Canonical documents (read these; treat everything else as historical)

| Purpose | Document | Status |
|---|---|---|
| Consolidated production go/no-go dossier | [`production-release-dossier-v1.0.1-2026-09-19.md`](./production-release-dossier-v1.0.1-2026-09-19.md) | **Canonical entry point — current** |
| Mandatory gate table + decision record | [`release-gate-checklist-v1.0.1-2026-09-19.md`](./release-gate-checklist-v1.0.1-2026-09-19.md) | Current - update after every remaining gate closes |
| Detailed narrative evidence | [`release-assurance-pack-v1.0.1-evidence-2026-09-19.md`](./release-assurance-pack-v1.0.1-evidence-2026-09-19.md) | Current, but read the gate checklist first for the authoritative pass/fail state |
| Documentation audit (meta) | [`release-readiness-documentation-audit-2026-09-19.md`](./release-readiness-documentation-audit-2026-09-19.md) | Current - explains why the two documents above exist and what corrections were applied |
| Operational procedure for future releases | [`../reference/claude-code-pre-release-runbook.md`](../reference/claude-code-pre-release-runbook.md) + `.github/workflows/production-deploy.yml` | Procedure, not evidence a specific release passed |
| Public-launch gate (separate, stricter bar) | [`../reference/testing/public-launch-gate-checklist.md`](../reference/testing/public-launch-gate-checklist.md) | Needs refresh from August evidence - do not treat as current without checking dates inside it |

## Mandatory gates still open (v1.0.1)

See the gate checklist for full detail. Summary:

| Gate | Status |
|---|---|
| Supabase backup/PITR confirmation | Open - needs a human to check the Supabase dashboard |
| Accessibility critical-path scan | Open - not run this release cycle |
| Login accessibility scan | Blocked by a reproducible non-terminating `networkidle` test wait; other axe-backed critical surfaces passed |
| Named incident lead / rollback operator | Open - no names recorded |
| Rollback rehearsal | Open - not run |
| Founder privacy/beta-terms/support confirmation | Open - founder-owned |
| Release-owner signature | Open - pending |

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
| Private Beta v1.0.1 | `88b8eb4453062315d2897445fbf5a855f4f25071` | GO WITH LIMITATIONS (pending sign-off) | 2026-09-19 |
