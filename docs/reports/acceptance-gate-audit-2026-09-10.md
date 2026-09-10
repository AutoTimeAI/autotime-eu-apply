# Acceptance-gate audit — core product investment strategy

**Date:** 10 September 2026
**Scope:** Every acceptance gate and release gate named in
[product-core-investment-strategy.md](../product-core-investment-strategy.md), checked against
the actual codebase (not assumed) — file, function and test cited per gate.
**Method:** Three independent code searches, one per pillar, each required to cite a specific file
path and function/test name as evidence rather than report a gate as met on the strength of intent
or documentation alone.

## Result summary

| Status | Count | Gates |
| --- | --- | --- |
| Enforced | 10 | 8, 13, 14, 15, 18, 20, 21, 22, 23, 24 |
| Partially enforced | 7 | 1, 3, 7, 9, 11, 12, 16 |
| Not found / real gap | 6 | 2, 4, 5, 10, 17, 19 |
| Process gate, not automatable (expected) | 1 | 6 |

10 of 24 gates are solidly backed by code and tests. 6 are gaps the strategy document currently
overstates as settled. The rest are real but incomplete.

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
**Partially enforced.** A real schema exists — `officialSourceCitationSchema`
(`packages/shared/src/international/types.ts:42-49`) requires `publisher`, `url`, `jurisdiction`,
`reviewedAt`, `ruleVersion` — and `orchestrateJobDecision` returns it. But the panel actually
rendered to users (`DashboardExperience.tsx:6548-6564`, "Official sources") reads from
`getOfficialSources(targetCountry)`, a different, older helper that only carries `label`/`note`/
`url` — no freshness or rule-version fields reach the screen a candidate sees.

**4. "Users can distinguish verified, inferred, user-declared and unknown facts."** — **Real
gap.** `evidenceStatusSchema` (`packages/shared/src/evidence/model.ts:4-11`) is
`["verified", "user_declared", "inferred", "conflicting", "stale", "missing"]`. There is no
`"unknown"` value anywhere in the codebase. `"missing"` is the closest analog but means something
different (the fact was never supplied, not that its truth is indeterminate). The strategy
document's own vocabulary isn't fully implemented.

**5. "Correction, override and disagreement reasons are measurable."** — **Not found.**
`apps/web/lib/analytics.ts` defines exactly six event types: `job_analysed`, `application_saved`,
`ai_content_generated`, `upgrade_clicked`, `subscription_started`, `upgrade_limit_hit`. None of
them fire on a user correcting an inferred fact, overriding a decision, or disagreeing with a
recommendation. This data literally isn't being collected.

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
achievements receive high-risk treatment."** — **Real gap.** Zero code references to "high-risk"/
"highRisk" exist outside the strategy document itself. There is no field-sensitivity
classification, no escalation path, no review flag tied to editing these specific fields. This is
prose only.

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

The strategy document is accurate about *intent* everywhere and accurate about *current state* in
under half of its acceptance gates (10 of 24 solid). The six real gaps cluster in one place:
**everything about making the decision engine's reasoning legible and correctable is weaker than
the document claims** — blockers are prose, not structured facts (#2); there's no "unknown" state
(#4); corrections and overrides aren't tracked at all (#5); high-risk field edits get no special
treatment (#10). These four gaps are the actual foundation of the moat-analysis document's rank-1
and rank-2 candidates (outcome-calibrated decisions, trustworthy mobility guidance) — they're
exactly the parts that need to be true for either moat mechanism to eventually work, and right now
they aren't fully built.
