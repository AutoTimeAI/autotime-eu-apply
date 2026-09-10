# Acceptance-gate audit — core product investment strategy

**Date:** 10 September 2026 (original audit); updated same day after closing three gaps.
**Scope:** Every acceptance gate and release gate named in
[product-core-investment-strategy.md](../product-core-investment-strategy.md), checked against
the actual codebase (not assumed) — file, function and test cited per gate.
**Method:** Three independent code searches, one per pillar, each required to cite a specific file
path and function/test name as evidence rather than report a gate as met on the strength of intent
or documentation alone.

**Update (same day):** gates 3, 5 and 10 were closed at low risk (purely additive - no change to
what a decision *is*, only what's tracked/shown/flagged). Gate 5 moved to partial, not full: only
correction and override are tracked; disagreement has no distinct existing UI action to hook
without adding new UI, so it remains untracked. See each gate's entry below for what changed and
what's still missing, and the commit closing them for full detail.

## Result summary

| Status | Count | Gates |
| --- | --- | --- |
| Enforced | 12 | 3, 8, 10, 13, 14, 15, 18, 20, 21, 22, 23, 24 |
| Partially enforced | 7 | 1, 5, 7, 9, 11, 12, 16 |
| Not found / real gap | 4 | 2, 4, 17, 19 |
| Process gate, not automatable (expected) | 1 | 6 |

12 of 24 gates are now solidly backed by code and tests (up from 10). The remaining gaps still
cluster around making the decision engine's reasoning structured and correctable at the data
level, not just at the UI/tracking level closed today — see "What this means" below.

## Pillar 1 — EU Fit

**1. "No decision is produced without the minimum required evidence defined by the
capability-readiness policy."** — **Partially enforced.** `apps/web/lib/capability-readiness.ts`
(`evaluateCapabilityReadiness`) is real and gates UI actions, but the actual decision engine
(`orchestrateJobDecision`, `packages/shared/src/international/orchestration.ts:49`) has its own
independent `missingInternational` check and never calls the capability-readiness policy. The gate
holds at the UI surface, not inside the engine that produces the decision.

**2. "Every hard blocker identifies its triggering fact and evidence status."** — **Not
enforced.** `getHardBlockers` (`packages/shared/src/eu-fit/decision-policy.ts:39-49`) returns
`string[]` built as `` `${label}: ${rationale}` `` — a formatted sentence, not a structured
`{ triggeringFact, evidenceStatus }` record. Every blocker type in the codebase
(`CombinedJobDecision.blockers`, `InternationalAssessment.confirmedBlockers`) is a bare string
array. There is nowhere in the code that could programmatically answer "which fact triggered this
blocker and what is its evidence status" — only a human reading the sentence can.

**3. "Every governed mobility statement exposes source and freshness information."** —
**Enforced (closed 10 September 2026).** `OfficialSource` (`apps/web/domains/eu-fit/types.ts`) now
carries optional `reviewedAt`/`ruleVersion`, populated in `official-sources.ts` from the exact
review dates/rule versions the country packs already record for UK, Ireland, Germany and
Netherlands. The "Official sources" panel shows "Reviewed \<date\> (rules \<version\>)" per source.
France has no dedicated country pack, so its sources deliberately show "Freshness not yet tracked
for this country" rather than an invented date — this is the one place the gate is still honestly
incomplete, by design rather than by oversight. Covered by
`scripts/acceptance-gate-fixes.test.mjs`.

**4. "Users can distinguish verified, inferred, user-declared and unknown facts."** — **Real
gap.** `evidenceStatusSchema` (`packages/shared/src/evidence/model.ts:4-11`) is
`["verified", "user_declared", "inferred", "conflicting", "stale", "missing"]`. There is no
`"unknown"` value anywhere in the codebase. `"missing"` is the closest analog but means something
different (the fact was never supplied, not that its truth is indeterminate). The strategy
document's own vocabulary isn't fully implemented.

**5. "Correction, override and disagreement reasons are measurable."** — **Partially enforced
(closed 10 September 2026).** `apps/web/lib/analytics.ts` previously defined six event types with
zero real call sites in the app. Added `fact_correction` (fires from `updateProductContext` when a
user manually sets a product-context field to a value different from the active CV-derived
suggestion) and `decision_override` (fires from `saveApplicationFromJob` when a job is tracked
despite a "blocked"/"stretch" content gate) - the first two real analytics call sites in the
codebase. "Disagreement" specifically still has no distinct existing UI action to hook without
adding new UI, so it remains untracked. Covered by `scripts/acceptance-gate-fixes.test.mjs`.

**6. "High-risk conclusions receive scenario-based QA and human subject-matter review before
their jurisdiction is marketed as supported."** — **Process gate, correctly not automated** — but
`docs/reference/roadmap-execution-status.md` itself already tracks this as unmet ("Named qualified
owners, jurisdiction reviews and vertical test evidence absent... intentionally blocked by
governance" for regulated professions). No per-jurisdiction sign-off log exists yet for the
countries already marketed as supported (UK, Ireland, Germany, Netherlands, France).

## Pillar 2 — Evidence integrity

**7. "Zero confirmed unsupported-claim incidents in release evaluation."** — **Partially
enforced.** `scripts/evidence-integrity.test.mjs` is real unit coverage for the classifier itself
(verified/user_declared → supported; inferred → needs confirmation; conflicting/stale → blocked;
unresolved links → unsupported) — but there is no adversarial harness that runs the classifier
against actual AI-generated prose to catch a claim the model invented outright. The gate as worded
("incidents in release evaluation") describes a release-metric process, not a specific test, and
no such process artifact exists.

**8. "All material application claims have an evidence reference or are visibly awaiting
confirmation."** — **Enforced.** `assessClaimSupport` (`packages/shared/src/evidence/model.ts:82-157`)
requires a `links` array and returns `status: "unsupported"` with an explicit reason when nothing
is linked — never silent. Covered by test `"missing and unresolved links remain unsupported"`.

**9. "Generated content cannot convert inferred evidence into verified evidence without user
action."** — **Partially enforced.** No code anywhere mutates `EvidenceFact.status` at all — so
the promotion this gate forbids is impossible today, but only because no promotion mechanism
exists yet, not because a guard checks and rejects it. There is no test asserting "an inferred fact
resists being flipped to verified," so this holds by absence rather than by a checked invariant —
it will not automatically stay true if someone adds a status-update code path later.

**10. "Edits to identity, employment dates, qualifications, work rights and quantified
achievements receive high-risk treatment."** — **Enforced (closed 10 September 2026).** Added
`apps/web/domains/profile/high-risk-fields.ts`, classifying `fullName`, `workRightDetails`,
`sponsorshipNeeded`, `baseCvText`, `experienceHighlights` and `projectSummaries` as high-risk (the
schema has no discrete "employment dates" or "quantified achievements" fields - that content lives
inside the three CV/highlights text fields, so those are classified high-risk too) and showing a
visible reason note under each of these fields in the profile form. Treatment here is UI-level
transparency, not an automated review/escalation pipeline - there is still no code path that routes
a high-risk edit to a reviewer. Covered by `scripts/acceptance-gate-fixes.test.mjs`.

**11. "Candidate data deletion, retention and export behavior match published privacy
commitments."** — **Partially enforced.** Export is real and complete —
`apps/web/lib/account-export.ts` explicitly includes `evidence_records`, `outcome_records`, and
`interview_prep_packs`. Deletion relies on database `ON DELETE CASCADE` plus one explicit
non-database cleanup (`deleteProfilePhotos`), but only that one photo-cleanup path has a test
(`production-hardening.test.mjs:801`) — nothing tests that deletion actually cascades into
evidence, outcome or prep-pack tables, and no retention-window logic (auto-expiring old data) was
found anywhere in the codebase.

## Pillar 3 — Application preparation

**12. "No kit is generated for a Skip decision without an explicit user override and recorded
reason."** — **Partially enforced, stricter than described.** `assessDraftEligibility`
(`packages/shared/src/application-preparation/policy.ts`) hardcodes
`BLOCKED_DECISIONS = new Set(["Skip", "Insufficient evidence"])` and unconditionally blocks
generation — there is no `override`/`reason` parameter anywhere in this function, the use case, or
the API route. The "never without override" half is technically true (there's no bypass at all),
but the override mechanism the gate promises doesn't exist — a user genuinely cannot override a
Skip today even if they wanted to.

**13. "Hard blockers remain visible throughout preparation."** — **Enforced.** Blockers are
threaded from `assessDraftEligibility`/`assessApplicationApproval` through
`ApplicationPreparationBlockedError` into the API's 422 response, and referenced directly in
`apps/web/domains/evidence/ready-to-apply.ts` and the application workspace UI.

**14. "All generated artifacts pass evidence-integrity checks."** — **Enforced.**
`assessDraftEligibility` takes `claimAssessments` and blocks on `"unsupported" | "conflicting" |
"stale"` before generation proceeds, covered by `scripts/evidence-integrity.test.mjs`.

**15. "The user controls export and submission."** — **Enforced.** No `autoSubmit` code path
exists anywhere in the repo. `getExportPermission`/`getSubmissionPermission` both require explicit
`humanReviewConfirmed`/confirmation booleans before either action is permitted.

**16. "ATS-safe output is verified against supported formats and platforms."** — **Partially
enforced.** `scripts/job-aggregation.test.mjs` has real per-platform coverage (Greenhouse, Lever,
Ashby, SmartRecruiters, Personio, Recruitee, BambooHR, Teamtailor, Jobvite, Workday, iCIMS) — but
all of it verifies *ingesting* jobs from those ATS platforms, not that AutoTime's *generated
application kit* is safe/well-formed for autofill into those same platforms. Different direction
of the same word "ATS," not yet tested.

**17. "Preparation time and abandonment are measurable without capturing sensitive document
content in analytics."** — **Real gap.** The privacy half holds (no CV/document text appears in
any tracked event), but there is no preparation-time or abandonment tracking at all — the metric
this gate describes isn't being measured, safely or otherwise.

## Broader release gates

**18. Unit/integration coverage for changed decision and evidence rules — Enforced.**
`scripts/country-fit-model.test.mjs`, `scripts/evidence-integrity.test.mjs`,
`scripts/application-preparation-policy.test.mjs`, `scripts/decision-quality-evaluation.test.mjs`.

**19. End-to-end verification from vacancy capture through approved kit and outcome status — Not
found as one journey.** Coverage exists but is split across phase-specific specs
(`25-phase-2-jobs-analysis`, `26-phase-3-applications`, `27-phase-4-interviews`) — no single
continuous spec walks capture → decision → kit → outcome as one journey.

**20. Adversarial unsupported-claim tests — Enforced** (same evidence as gate 14; "adversarial" is
generous for what are deterministic unit cases, but real coverage exists).

**21. User-isolation, authorization and sensitive-data-redaction checks — Enforced.**
`production-hardening.test.mjs` has dedicated tests for per-user profile isolation, atomic
per-user AI-call reservation, admin authorization failures, and diagnostics redaction.

**22. Accessibility verification — Enforced.** `tests/e2e/helpers/axe.ts` used across 9 specs
covering decisions, blocker states and forms.

**23. Mobile/responsive verification — Enforced.** `tests/e2e/visual/key-states.spec.ts` runs
every key state at both desktop and mobile viewports.

**24. Platform-specific capture/autofill tests — Enforced.** `apps/extension/tests/run-tests.mjs`
covers field mapping, safe-fill scoping, and CSV/formula-injection neutralization.

## What this means

The strategy document is accurate about *intent* everywhere and, as of the same-day fixes, is now
backed by solid code and tests in exactly half its acceptance gates (12 of 24). Closing gates 3, 5
and 10 was low-risk because none of them touch what a decision *is* - only what's tracked, shown
or flagged around it. The remaining real gaps (#2, #4, #19) are a different, harder category:
**making the decision engine's reasoning structured at the data level, not just visible at the UI
level.** Blockers are still prose, not structured `{ triggeringFact, evidenceStatus }` records
(#2); there's still no `"unknown"` evidence-status value (#4); there's still no single continuous
E2E journey from capture through kit to outcome (#19). These are exactly the gaps flagged as
higher-risk in the scoping conversation for this work - restructuring the decision engine's output
shape - and they remain the actual foundation the moat-analysis document's rank-1 and rank-2
candidates (outcome-calibrated decisions, trustworthy mobility guidance) still depend on.
