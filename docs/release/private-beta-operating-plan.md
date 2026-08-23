# Private Beta Operating Plan

Per the assessment brief's instruction: "Do not invent business
decisions. Mark unknown decisions as OWNER ACTION REQUIRED." Every
item below that isn't derivable from existing code/docs is marked as
such rather than guessed.

| Decision | Value | Source |
|---|---|---|
| Cohort type | Invite-only, per the assessment brief's own framing throughout | Assessment brief |
| Maximum user count | **OWNER ACTION REQUIRED** | Not specified anywhere in the repo |
| Eligibility criteria | **OWNER ACTION REQUIRED** | Not specified |
| Excluded users/use cases | **OWNER ACTION REQUIRED** | Not specified |
| Beta start date | **OWNER ACTION REQUIRED** | Depends on the release decision in `11-go-no-go-sign-off.md` |
| Beta end date / graduation criteria | **OWNER ACTION REQUIRED** | Not specified |
| Feedback mechanism | **OWNER ACTION REQUIRED** | No feedback form/channel identified in the repo beyond the anonymous extension bug-report endpoint (`/api/compatibility/reports`), which is not user-feedback-shaped |
| Support channel | **OWNER ACTION REQUIRED** | See `docs/operations/private-beta-support-runbook.md` |
| Security-reporting route | **OWNER ACTION REQUIRED** | No `SECURITY.md` exists in the repo |
| Success metrics | **OWNER ACTION REQUIRED** | Not specified |
| Paid/free status | **OWNER ACTION REQUIRED** | Determines whether `PAY-###` gates are mandatory or NOT APPLICABLE for this beta — see `12-founder-action-list.md` item 7 |
| Data-handling expectations communicated to users | **OWNER ACTION REQUIRED** | Privacy/terms docs exist but are explicitly documented as drafts, not legally reviewed |
| Known limitations to disclose | Drawn from `docs/qa/10-known-risks-and-limitations.md` | This assessment |
| Incident owner | **OWNER ACTION REQUIRED** | Presumably the founder for a solo-operated product; not formally recorded anywhere |
| Rollback owner | **OWNER ACTION REQUIRED** | Same |

## Suggested stop criteria (from the assessment brief, adopted as a starting proposal)

- Confirmed cross-user data exposure
- Unresolved Critical or High security issue
- Duplicate customer charge
- Incorrect AI-credit charging
- Unrecoverable data loss
- Inability to delete/export user data
- Major privacy incident
- Repeated production instability
- Failure of monitoring or rollback

**OWNER ACTION REQUIRED**: confirm these as-is or adjust for your
actual risk tolerance; this assessment adopts them as sensible
defaults per the brief's own suggestion, not as a founder decision
already made.

## Known limitations to disclose (populated, not a placeholder)

Per `docs/qa/10-known-risks-and-limitations.md`:
- No independent, professional penetration test — founder-led/automated only.
- Backup/restore/rollback not yet demonstrated as of this assessment.
- A known authenticated-dashboard performance regression under investigation (`DEF-003`).
- Privacy/terms documents remain drafts, not legally reviewed.
- Cross-user isolation evidence is primarily code/API-layer, not a live two-account production test (only one QA account exists).

## What this plan does NOT attempt

This assessment does not set a user count, a launch date, or pricing
— those are founder business decisions this program is explicitly
instructed not to invent. This document exists so those decisions
have a clear place to be recorded once made, alongside the technical
readiness evidence the rest of this program produced.
