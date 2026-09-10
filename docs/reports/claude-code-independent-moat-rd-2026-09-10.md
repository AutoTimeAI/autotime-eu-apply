# AutoTime EU Apply: Claude Code Independent Moat R&D Report

**Date:** 10 September 2026
**Commissioned by:** `docs/reports/claude-code-moat-rd-handoff-2026-09-10.md`
**Reviewed against:** `docs/reports/startup-moat-rd-dossier-2026-09-10.md` (Codex) and
`docs/reports/moat-rd-strategy-2026-09-10.md` (Codex, referenced but not independently re-derived
line-by-line in this pass — see the Comparison section for what was and wasn't re-verified), plus
`docs/reports/european-tech-mobility-market-rd-2026-09-10.md` (Codex, a third independent
19-market research pass that appeared mid-session — cross-checked directly against this session's
own European Tech Mobility Atlas in Section 15).
**Method:** direct repository inspection (file reads, greps, reachability tracing — the same method
used throughout this session's acceptance-gate and technical-debt audits) plus targeted live web
research for claims this session had not already independently verified. Every "reachable in
production" or "dead code" claim below was traced by hand through the actual routing/component
tree, not inferred from a file's existence or a doc's description of it.

**A note on how this report was produced, because it's relevant to how much to trust it:** this
session ran two background research agents for an earlier, narrower competitive question and both
silently failed — no crash message, no completion signal, one output file frozen at 0 bytes. That
failure was only caught because the user pushed back on an implausible "still running" status after
over an hour. Nothing in this report was produced by an unmonitored background process; every claim
below traces to a tool call this session executed and observed the result of directly.

---

## 1. Executive verdict

**The ten-capability framework is the right one, and Codex's headline number is approximately
right but for a reason Codex didn't have the ground truth to state precisely.** Codex estimated
"15-25% of technical foundations present, under 10% of the complete governed moat system." This
session's own repository audit (Section 2) finds **3 of 10 capabilities present, 2 partial, 5
missing** — consistent with Codex's range, but the more important correction is *which* three are
present and what "present" actually means for two of them.

Two of the "useful foundations" both the handoff brief and Codex's dossier list — `getDecisionBrief`
and `createEvidenceRecords` — are not merely incomplete prototypes of the target system. **They are
unreachable in production.** They compute correctly, but their only caller is a component
(`DashboardExperience.tsx`) whose relevant tab is never rendered by any live route. A third,
`assessCoreLoopTrace`, is well-designed, privacy-safe, and built against the *correct* live data
shapes — but has zero production callers anywhere, not even a dead one; it exists only in its own
test. Codex's gap-map table (dossier, "Repository-to-moat gap map") treats all three as partial
progress toward the target architecture. That's not wrong about the code's *content*, but it
overstates how much of that content a real user, or a real release decision, can currently rely on.

This matters for the founder decision the handoff brief asks about directly: **is bitemporal policy
warranted now, or can a simpler append-only revision model meet the first two-country requirement?**
My answer, informed by this finding: build the simpler model first, and wire it to something with a
live caller before investing in bitemporal sophistication. The repository's actual failure mode
today isn't "the data model is too simple" — it's "correctly-designed governance code exists and
nothing calls it." That's a cheaper, faster problem to fix than Codex's proposed nine-entity
bitemporal schema, and fixing it first would produce real operational evidence about which parts of
the target architecture the product actually needs.

**Weakest assumption in both Codex documents:** the assumption that rank-2 of the original moat
analysis (governed mobility data) has time to mature before a well-funded competitor ships something
similar. It doesn't. Deel has already opened an individual-facing Visa Eligibility Checker with an
assigned human mobility specialist per case (Section 6) — live today, not a future risk. Neither
Codex document mentions Deel. This doesn't invalidate the thesis; it changes the deadline from
"durable long-term advantage" to "a race that started before this report was written."

**Where I agree with Codex without reservation:** the regulatory framing (UK IAA's
information-vs-advice boundary, the EU AI Act's candidate-side/employer-side distinction, GDPR
Article 22's applicability even without a fully automated legal-effect decision), the
deterministic-vs-LLM architecture boundary, the evaluation-science citations on explanation and
verifiability, and the core proprietary-loop thesis (`evidence → decision → claim → approval →
correction → outcome`) are all well-reasoned and I found no repository or external evidence
contradicting them. I did not re-derive all 37 of Codex's citations from primary sources in this
pass — see Section 12 for exactly which ones I spot-checked and which I'm relying on Codex having
gotten right.

## 2. Repository audit — independent, file-level

Method: for every capability, I read the implementing file(s), then traced every caller with `grep`
until I reached either a live route (`apps/web/app/**/page.tsx`) or confirmed there is no live
route. This is the same reachability-tracing method this session already used to find
`DashboardExperience.tsx`'s dead "jobs" tab (`docs/reference/technical-debt.md`).

| Capability | Codex verdict | My verdict | What I found that changes the picture |
| --- | --- | --- | --- |
| 1. Versioned mobility sources | Missing | **Missing — agree** | `OfficialSourceCitation` (`packages/shared/src/international/types.ts`) holds one `reviewedAt`/`ruleVersion` snapshot per source. No revision table, no prior-value retention. |
| 2. Source-change detection | Missing | **Missing — agree** | No hashing, diffing, or scheduled-check infrastructure for government source pages anywhere in the repo. |
| 3. Immutable decision records | Partial | **Present, for the live path — stronger than Codex's "partial"** | `job_workflow_analysis_snapshots` (Supabase) is genuinely append-only: `unique(job_id, version)`, no update/delete RLS policy defined for it or sibling tables. Mirrored client-side in `JobAnalysisResult.version = job.analysisHistory.length + 1`. This is real, working, and live — `JobApplicationWorkspace` writes to it on every analysis. Codex's "partial" verdict likely reflects that it doesn't yet bind policy-bundle/source-revision IDs (true, and worth keeping as a gap), but the append-only *mechanism* itself is solid, not partial. |
| 4. Employer/sponsor verification | Missing as governed capability | **Partial — agree with Codex's substance, disagree with "missing as governed capability"** | `stamp4-client.ts`'s `fetchStamp4SponsorshipAssessment` makes a real live call to an external sponsorship-check service for UK/Ireland/Netherlands/Germany specifically (`isStamp4SponsorshipCovered`). This is a genuine, governed, external verification integration for 4 of the 19 markets this session researched — not just "basic sponsorship signals." Everywhere else it correctly falls back to user-asserted text. |
| 5. Candidate evidence provenance | Partial | **Partial — agree, and it's better than the DashboardExperience-only version Codex may have read** | The LIVE version (`packages/shared/src/evidence/model.ts`'s `evidenceStatusSchema`: verified/user_declared/inferred/unknown/missing/conflicting/stale, feeding `assessClaimSupport`) is per-fact, tested, and reachable from `JobApplicationWorkspace`. The DashboardExperience-only version (`evidence-records.ts`'s `createEvidenceRecords`) is a *separate*, coarser, dead implementation — see below. Codex's gap-map table cites `createEvidenceRecords` specifically; if that's the file informing this verdict, the assessment should be "the live evidence-status model is better than this dead one, not a deepening of it." |
| 6. Claim-to-evidence links | Missing | **Present — disagree with Codex** | `assessClaimSupport` (`packages/shared/src/evidence/model.ts:82-157`) requires a `links` array per claim and returns `status: "unsupported"` with an explicit reason when nothing is linked — never silent. This is live, tested (`scripts/evidence-integrity.test.mjs`), and enforced before kit generation via `assessDraftEligibility`. It does not have stable position-anchored spans into source documents (Codex's target architecture wants this, and is right to want it) but the core claim-must-link-to-evidence-or-be-flagged mechanism is real and running today, not missing. |
| 7. Decision replay | Missing | **Missing — agree, and worse than "missing" implies** | Not only is there no pinned-policy-version replay mechanism; the code's own comments (`job-application-workflow.ts:61-69`) explicitly acknowledge that historical snapshots "need a schema migration or silently go stale relative to country-pack updates." The team already knows this gap exists; it's documented as a known limitation, not an unexamined absence. |
| 8. Correction/disagreement capture | Partial | **Partial — agree, with a specific correction to an earlier finding of my own this session** | `trackFactCorrection` (fires from `updateProductContext`) is live, reachable via `/dashboard/autofill-profile`. `trackDecisionOverride` (fires from `saveApplicationFromJob`) exists in code but its only call site sits inside `DashboardExperience.tsx`'s `currentTab === "jobs"` block, which no live route ever renders — confirmed dead by direct trace, not assumption. (A background subagent earlier in this session incorrectly reported this as "both live" by checking only that `DashboardExperience` mounts somewhere reachable, without checking the specific tab gate around this exact button. I caught and corrected that in-conversation before it reached any document; flagging it here too since accuracy on this exact point matters for the moat claim.) |
| 9. Country readiness scores | Missing | **Missing — agree** | Only a binary `CountrySupportLevel = "full" | "explorer"` exists. No graduated score anywhere in `assessment.ts` or `types.ts`. |
| 10. Expert sign-off records | Missing | **Missing — agree, and now partially scaffolded** | No DB table or schema exists. `docs/reference/jurisdiction-signoff-log.md` (added this session, same day as this report) is a deliberately-empty markdown tracking table for the four full-support jurisdictions — real scaffolding for the *process*, explicitly not a claim that any review has happened, and not a queryable system. Codex's target schema (`expert_signoffs` table, Section 653 of the dossier) is the right shape to eventually replace this doc with. |

### 2.1 A finding neither Codex document surfaced: three "foundation" files are more dead than described

The handoff brief lists `apps/web/domains/eu-fit/decision-brief.ts`,
`apps/web/domains/evidence/evidence-records.ts`, and `apps/web/domains/core-loop/traceability.ts`
as files to inspect. I traced all three to their actual callers:

- **`decision-brief.ts`** (`getDecisionBrief`, `getEvidenceLedgerRows`, `getVerificationChecklist`,
  `getContentGuardrails`) — called only from `DashboardExperience.tsx`, and specifically from the
  `currentTab === "jobs"` block. Per this session's earlier reachability audit
  (`docs/reference/technical-debt.md`), no live route ever sets `currentTab` to `"jobs"` —
  `/dashboard/jobs` renders `JobApplicationWorkspace`, a different component entirely. This entire
  module computes a decision brief, an evidence ledger, a verification checklist, and content
  guardrails that **no production user has ever seen**, confirmed by tracing every one of its four
  exported functions to their JSX render site (line ~6071 onward, inside the dead tab boundary
  opened at line 5889).
- **`evidence-records.ts`** (`createEvidenceRecords`) — same caller, same dead tab, same
  legacy `CandidateProfile`/`ApplicationRecord`/`CountryFitEvaluation` type shapes that only
  `DashboardExperience`'s own parallel "companion dashboard" state model uses (not the live
  `JobRecord`/`ApplicationWorkspace` shapes `JobApplicationWorkspace` and the evidence-integrity
  pillar actually use).
- **`traceability.ts`** (`assessCoreLoopTrace`) — the one bright spot, and worth calling out
  precisely because it's the opposite failure mode: this function is *correctly* built against the
  live data shapes (`ApplicationWorkspace`, `JobRecord`, `InterviewRecord` from
  `job-application-workflow.ts`/`interview-workflow.ts`), is well-designed (privacy-minimal by
  construction — returns identifiers/stages/issue-codes, never candidate or vacancy content), has
  real test coverage (`scripts/core-loop-traceability.test.mjs`), and validates exactly the
  captured→decided→preparing→approved→applied→interview→outcome continuity that this session's new
  gate-19 spec (`tests/e2e/37-continuous-application-journey.spec.ts`) proves end-to-end through the
  UI. **It has zero production callers anywhere in the codebase** — not a dead tab, not any tab.
  `docs/reference/core-foundation-execution.md` (last touched this session's timeframe) states
  flatly that "core-loop validation rejects approval without a retained decision" and "rejects
  submission without explicit confirmation" — present tense, as if this is an active runtime gate.
  It is not. It is a correct, tested, *unwired* function.

**Why this is the single most actionable finding in this report:** unlike the five genuinely-missing
capabilities, closing this gap doesn't require new architecture, new schemas, or new research. It
requires calling an existing, correct, tested function from somewhere real — for instance, as a
release-time integrity check across all live application records, or surfaced as a
"your application history is consistent" signal in `JobApplicationWorkspace`. This is a
same-day-scale fix that would move capability #3 (immutable decision records) and part of #8
(correction/disagreement capture, since core-loop violations are a form of detectable
inconsistency) meaningfully forward, at a fraction of the cost of any of Codex's proposed new
entities.

### 2.2 A stale document that should not inform release decisions

`docs/reference/testing/outcome-quality-test-matrix.md` ("Last updated: 2026-05-23") cites test
files — `tests/e2e/03-eu-fit.spec.ts`, `tests/e2e/02-job-import.spec.ts`,
`tests/e2e/06-full-happy-path.spec.ts` — that **do not exist in the current repository**. I checked
directly; all three return "no such file." This document predates the migration to the current
phase-numbered spec convention (`25-phase-2-jobs-analysis.spec.ts` and similar) this session has
worked with extensively, and its "Pass"/"Partially Covered" status column is describing a product
generation that no longer exists. Neither Codex document flags this. Treat every status claim in
that file as unverified until it's re-audited against the current test suite — it should not be
cited as evidence of current test coverage in any founder decision.

## 3. Architecture critique

Codex's proposed domain model (`role_case → evidence_fact → evidence_source → source_span`,
`decision_snapshot → decision_reason → policy_rule_version`, `mobility_source → source_revision →
policy_rule_version → governed_scenario → expert_signoff`) is sound and matches the actual shape of
the problem — I have no material redesign to propose. Three refinements based on what this
session's repository audit found:

1. **Build the "wire it up" step before the "make it bitemporal" step.** Section 2.1's finding
   (`assessCoreLoopTrace` exists correctly but is uncalled) is direct evidence that the repository's
   bottleneck right now is integration, not data-model sophistication. Codex's own proposed migration
   sequence ("Create additive tables → dual-write → shadow-mode compare → backfill → switch") is the
   right *shape* but should start from "wire the correctness checks that already exist and are
   correct" rather than "design nine new entities." A team that ships the wiring first gets real
   signal about which of the nine entities are actually load-bearing before committing schema design
   time to all of them.
2. **The live/dead split is itself an architectural signal.** `JobApplicationWorkspace` and
   `job-application-workflow.ts` (live) already use a cleaner type model (`JobRecord`,
   `ApplicationWorkspace`, `SourcedValue` with explicit `state: "extracted" | "user-confirmed" |
   "missing" | "conflicting"`) than the dead `DashboardExperience`/`CandidateProfile`/
   `CountryFitEvaluation` model Codex's gap-map table cites file examples from. Any new evidence/claim
   schema work should extend the live model, not the dead one — extending the dead one would produce
   a second unreachable subsystem.
3. **`prepareApplicationKit`'s port-based design (`ApplicationPreparationPorts`: `decisions`,
   `generator`, `usage`) is a genuinely good pattern already in the codebase** and is the right shape
   for the "constrained draft → claim check → human approval" pipeline Codex's dossier describes.
   This session extended its live caller surface this same day (a new AI-kit-generation feature in
   `JobApplicationWorkspace`, reusing this exact pipeline rather than building a second one) — worth
   noting as a positive existing precedent for "build once, wire to multiple live surfaces" rather
   than each new capability getting its own parallel implementation, which is the failure pattern
   that produced the dead `DashboardExperience` code in the first place.

## 4. Dependency analysis

Codex's three-phase sequence (truth/history → evidence/application integrity → learning/governance)
is correct in principle. Refined minimum-safe sequence given the reachability findings above:

1. **Wire `assessCoreLoopTrace` into a live path** (release check or in-product signal) — no schema
   change, immediate signal quality improvement, days not weeks.
2. **Confirm the live evidence-status/claim-link mechanism (`evidence/model.ts`) is the one extended
   going forward**, explicitly deprecating `evidence-records.ts`'s dead parallel implementation
   rather than deepening it.
3. **Then** Codex's Phase 1 (versioned sources, source-change detection, immutable snapshots binding
   exact policy/source versions, decision replay) — genuinely needs new schema and is correctly
   sequenced first among the *new* work, since evidence/claim work depends on knowing which policy
   version produced a decision.
4. Phase 2 (evidence provenance depth, claim-to-evidence spans, employer verification breadth beyond
   the 4 Stamp4-covered countries) — extends what's already live rather than building new.
5. Phase 3 (correction taxonomy, readiness scores, expert sign-off records) — correctly last; sign-off
   record *shape* should be designed alongside Phase 1 as Codex recommends, even if the review UI
   ships later.

**Circular dependency Codex didn't flag:** expert sign-off records (capability 10) and country
readiness scores (capability 9) both want to reference which scenarios/pathways have been reviewed
— but the scenario ontology itself (Codex's "Scenario ontology v1") doesn't have stable identifiers
yet, and neither does the sign-off schema. Sequence: freeze scenario IDs before either sign-off
records or readiness scores can meaningfully reference "which scenarios were tested," or both will
need a migration the moment the ontology stabilizes.

## 5. European research strategy

This session independently completed real, sourced research across 19 European markets the same
day, using 5 parallel research passes with direct WebSearch/WebFetch against official government
pages where reachable — published as a standalone artifact (European Tech Mobility Atlas) and
summarized with confidence tiers. Rather than re-deriving Codex's beachhead analysis from zero, here
is how the two independent research efforts compare:

- **Agreement:** both this session's research and Codex's dossier independently converge on
  Germany + Netherlands as the strongest beachhead pair — Codex via Eurostat Blue Card volume data
  (72% of EU Blue Cards issued in Germany) and the Netherlands' verifiable recognised-sponsor
  register; this session via direct confirmation that both countries' official immigration pages
  (`ind.nl`, and Germany's figures via secondary trackers since `make-it-in-germany.com` blocked
  direct fetch) gave the cleanest, most currently-dated thresholds of the 19 researched.
  **Independent convergence on the same two countries from two different methods is a meaningfully
  stronger signal than either analysis alone.**
- **Disagreement/refinement:** Codex's corridor table treats Ireland and the UK as "research
  corridors pending operational and regulatory proof" without ranking them against the other 15
  markets this session researched. This session's confidence-tiered atlas found Ireland
  fully-sourced from `enterprise.gov.ie` (high confidence, on par with Netherlands), while UK's own
  `gov.uk` sourcing is also high-confidence but structurally separate (non-EU, points-based, its own
  regulated-advice regime per Codex's own correct UK IAA analysis). Recommendation: Ireland should
  sit in the same "Wave 2" tier as France/Sweden/Denmark/Finland (this session's atlas), not held
  back to the same uncertain tier as the UK — its regulatory posture is ordinary EU/EEA, not the
  UK's separate advice-regulation problem Codex correctly isolates.
- **Additional finding beyond both Codex documents:** this session's research found that the
  EC's own official EU Blue Card portal carries visibly stale data for at least three countries
  (Italy: €33,500/yr figure dated to 2024; Estonia: similarly dated; Poland: PLN 9,519 vs. secondary
  trackers' PLN 13,355 for 2026) — a data-quality problem with the *public infrastructure* AutoTime
  would otherwise treat as a trustworthy upstream source. This is a concrete argument for Codex's
  source-change-detection capability (#2) mattering even for "official" sources, not just
  third-party trackers.
- **19-market confidence tiers (this session, not previously in either Codex document):** 7 markets
  (Netherlands, Ireland, France, Sweden, Denmark, Finland, UK) fully sourced from a directly-fetched
  official page; 7 partial; 5 (Belgium, Norway, Portugal, Poland, Czechia) hit blocked/404/stale
  official pages this session and need a manual pass before any product claim cites a specific
  figure for them. Full detail in the published European Tech Mobility Atlas from earlier the same
  session.

## 6. Regulatory risk

I did not re-derive Codex's UK IAA, EU AI Act, GDPR, or CNIL analysis from primary sources in this
pass (see Section 12 for what I did and didn't verify) — I read it critically against the
repository's actual behavior and found no contradiction. Two additions:

1. **Codex's UK-advice-boundary caution applies with equal force to the new AI-kit-generation
   feature this session added to `JobApplicationWorkspace`.** That feature generates cover
   letters/motivation answers grounded in `assessApplicationDecision`'s output, which for a
   sponsorship-required candidate routes through `assessInternationalJob` — the same engine Codex's
   "decision ceiling" concept (never let a personalized conclusion leak past regulatory scope) should
   govern. This session's implementation did not add a decision-ceiling concept; it inherited
   whatever `assessApplicationDecision` already enforces (the `Insufficient evidence`/`Skip` gating
   from earlier gate-1 work). That's *adequate* for the current UK-excluded, EU-only country coverage
   but would need Codex's explicit ceiling mechanism before any UK-specific personalized claim ships
   through this same pipeline.
2. **A live, funded competitor (Deel) has apparently already made its own regulatory call to open
   individual-facing visa guidance with human review** (Section 7). That's evidence — not proof, but
   real evidence — that the "governed individual mobility guidance" category is operable within
   *some* regulatory interpretation at scale, which is useful context for AutoTime's own legal review
   even though it doesn't substitute for AutoTime obtaining its own scope opinion, as Codex correctly
   insists on.

## 7. Competitive reality check (real research, not in either Codex document)

Neither Codex document names living, individual-facing competitors. This session did direct research
(after two background research agents silently failed and were abandoned — see the note at the top
of this report) and found:

- **AI job-search copilots stay generic or US-specific — this validates part of the moat thesis:**
  Jack & Jill (~230,000 candidate users, $20-50M raised, London) makes no jurisdiction-specific
  mobility claims found in its product; its only visa-related material concerns its own ~25-person
  hiring, not a candidate feature. JobRight.ai and Simplify.jobs both offer only a binary US
  "H-1B sponsor / does not sponsor" *label* on job cards — the same shallow signal AutoTime's own
  `analyseJob` had before this session's earlier fixes, and US-only besides. Teal and Huntr have no
  mobility features at all.
- **Deel Mobility is the real, live threat this session found and neither Codex document
  addresses:** Deel has opened its immigration product to individuals — a free Visa Eligibility
  Checker plus an assigned human mobility specialist per case, available with or without a Deel
  employment contract. This is a well-funded ($12B+ valuation company per public reporting),
  currently-operating, individual-facing, human-reviewed mobility product — structurally the same
  category as AutoTime's rank-2 moat candidate. **Not independently verified this pass:** exact
  EU-jurisdiction depth of Deel's checker, whether it makes evidence-linked claims or a bare
  pass/fail signal, and its individual-facing pricing.
- **Localyze**, Europe-founded and backed by General Catalyst/Y Combinator, was **acquired by
  Boundless Immigration in October 2025**, creating a combined US+Europe mobility platform — but
  remains strictly B2B (sold to HR/employers), not a direct candidate-facing competitor.
- **Multiplier and Remote.com, verified after the founder lifted the time constraint on this
  assignment: both stay employer-initiated, unlike Deel.** Multiplier's visa process is triggered by
  HR "during onboarding," after an employee has already been hired, and its eligibility check
  requires the candidate's details to already be "confirmed" by the employer first. Remote.com's
  equivalent is explicitly scoped as a "pre-employment eligibility check for EOR clients" — run
  before an offer, but still at the employer's initiative, not the candidate's. Neither offers a
  genuinely candidate-initiated, no-employer-relationship-required self-assessment the way Deel
  does. **This narrows, rather than widens, the competitive picture from Section 7's first pass:**
  Deel is not one of several mobility platforms converging on candidate-facing guidance — on the
  evidence found, it is currently the outlier. That makes it more important to watch specifically,
  not less, but it also means the wedge AutoTime is racing against is one company's product
  decision, not an industry-wide trend every EOR platform is independently arriving at. Smaller
  EU-regional competitors remain unverified.

**What this changes for the founder decision:** AutoTime's differentiated wedge against Deel
specifically isn't "we offer mobility guidance" — Deel already does. It's the *combination* Codex's
dossier and this session's capability audit both point at: evidence-linked, source-cited,
freshness-tracked guidance integrated with application preparation, where the same governed decision
that assessed eligibility also produces the claim-checked application content. That combination
remains real and undifferentiated by anyone found in this research. But per Section 2's findings,
the operational capabilities that would make it durably true (versioned sources, replay, readiness
scores, sign-off records) are mostly unbuilt — so this is the thing to build now, under real
competitive pressure, not a comfortable structural advantage.

## 8. Source-operations plan

Codex's source-class table (sponsor registers / salary tables / statute-rules / explanatory guidance,
each with its own poll cadence and detected→review_required→approved→published→superseded→incident
state machine) is the right design and I did not find repository evidence to improve on it. One
addition from this session's mobility-atlas research: **add "official portal itself may be stale" as
a monitored source class**, not just third-party pages — the EU Blue Card portal's own stale Italy/
Estonia/Poland figures (Section 5) mean even "official" doesn't guarantee current, and a
source-change-detection system that only watches third-party trackers would miss this exact failure
mode.

## 9. Evaluation plan

I have no material disagreement with Codex's evaluation-science section (consequence-specific error
thresholds, appropriate-reliance study design, two-independent-expert review, blinded challenge
sets) — the cited research (Alufaisan et al. on explainable-AI decision-making, Fok & Weld on
verifiability) is real, relevant, and correctly summarized against what I know of that literature.
One repository-grounded addition: **the stale `outcome-quality-test-matrix.md` (Section 2.2) is
itself an argument for Codex's evidence-grade system (E0-E4)** — a document describing tests that no
longer exist would, under that grading system, need to be explicitly re-graded to E0 (untested
assumption) rather than implicitly trusted at whatever grade its "Pass" column implies today.

## 10. Commercial challenge

No repository evidence bears directly on Codex's pricing brackets, unit-economics assumptions, or
Stripe fee structure — this is genuinely outside what code inspection can validate, and Codex's
citation of Stripe's actual UK pricing page is the correct kind of evidence for this section. I
have no independent finding to add or dispute here beyond noting that this report's own competitive
findings (Section 7) suggest the "decision pass" and "active search" price points should be tested
against Deel's actual individual-facing pricing once verified, not priced in a vacuum relative to
Teal/Huntr's generic-tool pricing alone.

## 11. Moat falsification

Codex's falsification conditions are sound. One addition given Section 7's finding: **add "a
well-funded competitor ships evidence-linked, jurisdiction-specific guidance with comparable
governance" as an explicit falsification trigger**, distinct from "official self-service pages solve
the decision" (Codex's existing condition, which describes a *weaker* competitive threat than a
funded company actively building the same category). Deel's current product doesn't yet meet this
bar on available evidence, but the falsification ledger should watch for it explicitly rather than
only for commodity autofill tools improving.

## 12. What I verified directly vs. relied on Codex for

In the interest of the evidence-standard the handoff brief itself demands ("do not describe
marketing statements as independently proven outcomes," "record the research date"):

**Verified directly this pass (file reads, greps, or fresh web research with observed results):**
all of Section 2's repository claims; all of Section 7's competitor claims; the file-existence check
in Section 2.2; the 19-market mobility research referenced in Section 5 (completed earlier the same
session, separately from this report).

**Read critically but not independently re-sourced:** Codex's UK IAA, EU AI Act, GDPR/CNIL/ICO,
NIST AI RMF, evaluation-science, EPO patentability, and Stripe-fee citations (Sections 6, 9, 10, and
the dossier's IP-posture section). I found nothing in the repository or in this session's own prior
research that contradicts any of these, and the citation style (specific document titles, dated
access, direct URLs to primary regulator/standards-body pages rather than blog summaries) is
consistent with real sourcing rather than fabrication. This is a lower confidence grade than
Section 2 or Section 7's findings — treat these as "independently plausible, not independently
re-verified" rather than "confirmed."

## 13. Comparison summary

| Question | Codex | This report |
| --- | --- | --- |
| Are any of the ten capabilities more complete than Codex assessed? | — | Yes: #3 (immutable records) and #6 (claim-to-evidence links) are genuinely live and working for the current product surface, not merely partial. |
| Is anything Codex called "partial progress" actually dead code? | — | Yes: `getDecisionBrief`, `createEvidenceRecords`, and everything under `DashboardExperience.tsx`'s dead "jobs" tab. |
| Is anything correct but completely unwired? | — | Yes: `assessCoreLoopTrace` — the single highest-value, lowest-cost fix identified in this report. |
| Beachhead corridor | Germany + Netherlands | Agree, independently converged from different evidence. Ireland should rank alongside France/Sweden/Denmark/Finland, not held with the UK's separate regulatory tier. |
| Named live competitors | None named specifically | Deel Mobility (individual-facing, human-reviewed, live) is the material finding neither Codex document surfaced. |
| Architecture | Nine-entity bitemporal domain model | Right shape; sequence "wire what already exists correctly" before "build bitemporal sophistication." |
| Overall completion estimate | 15-25% technical foundations, <10% full moat system | Consistent, with the correction that some of that 15-25% is unreachable rather than partially built — a meaningfully different risk profile for the same headline number. |

## 14. What this session's own work already changed since the handoff brief was written

For completeness, since this report and the handoff brief were produced hours apart in the same
session: earlier the same day, this session closed acceptance gate 19 (one continuous E2E journey,
`tests/e2e/37-continuous-application-journey.spec.ts`), fixed a live bug in
`orchestrateJobDecision` that was misclassifying clean fit reviews as blocked (commit `4a4dc6e3`),
shipped AI-assisted application-kit generation in the live `JobApplicationWorkspace` (commit
`6f6e4699`), and — per the file-change evidence observed mid-session — a parallel session appears to
have already begun unifying the two independent decision paths this report's predecessor
conversation had flagged as technical debt (`resolveAssessmentCountry`, `vacancyRejectsSponsorship`
shared helpers now present in both `decision-adapter.ts` and `job-application-workflow.ts`). None of
this is reflected in either Codex document, which predates it. The synthesis document called for by
the handoff brief should treat this report's repository findings, not Codex's, as the current state
where the two disagree on reachability — Codex's dossier was written without the live-tracing work
this session had already done.

## 15. Addendum — direct verification against a third independent dataset and Codex's key citations

Added after the founder removed the time constraint on this assignment. A fourth document
appeared mid-session: `docs/reports/european-tech-mobility-market-rd-2026-09-10.md` (Codex,
19-market coverage, independent of this session's own earlier European Tech Mobility Atlas). Cross-
referencing all three 19-market datasets against each other, and directly re-verifying two of
Codex's most load-bearing regulatory citations, surfaced two findings worth recording precisely.

### 15.1 France and Sweden: two "conflicting" figures across the three datasets are both correct — and this is a general problem, not a France/Sweden-specific one

This session's own earlier Atlas recorded France at €39,582/yr and Sweden at SEK 34,470/month.
The new Codex market-rd document recorded France at €59,373/yr and Sweden at SEK 53,625/month —
materially different numbers, for the same countries, researched independently the same day.

Direct re-verification (fresh web research, not re-reading either prior document) resolves this:
**both figures are correct, for two different routes within each country.**

- France: €39,582/yr is the "Talent — Skilled Employee" (*salarié qualifié*) route; €59,373/yr is
  the EU Blue Card route specifically — exactly 1.5× the same base reference salary. Both are real,
  current 2026 figures. A candidate earning €45,000 qualifies for the first route but not the
  second.
- Sweden: SEK 34,470/month is the standard work-permit route (90% of Sweden's median wage,
  effective from mid-2026); SEK 53,625/month is the EU Blue Card route (1.25× the average gross
  salary, effective 15 July 2026) — a ~55% difference. These are two genuinely separate permit
  types with separate rules, not a data-quality error in either research pass.

**Why this matters more than a two-country footnote:** this is very likely a *systematic* pattern,
not a coincidence isolated to France and Sweden. Every full-support country this session and Codex
both researched (Germany, Netherlands, Ireland among them) has, or plausibly has, both a national
route and a separate EU Blue Card route with its own threshold. A product or country-pack design
that stores "the salary threshold for country X" as a single value is structurally wrong for any
country with more than one route — not incomplete, *wrong*, in a way that would produce a
confidently-stated incorrect answer for whichever route wasn't the one encoded. This is direct,
freshly-verified evidence in favor of Codex's route-scoped `policy_rule_versions`/country-pack
design (Section 3 of Codex's dossier; the market-rd document's "country-pack contract") over any
simpler country-only model — not a hypothetical architecture preference, a concrete example of the
exact failure it prevents.

**Product implication:** `packages/shared/src/international/country-packs/*.ts` currently models
`pathways: string[]` as a flat list per country pack (confirmed by direct read of `ireland.ts`,
`uk.ts`, `germany.ts`, `netherlands.ts` earlier this session) without a distinct threshold per
pathway — the pathway *names* are there, but nothing in the current schema prevents a future
contributor from attaching one salary figure to a country that actually has two routes. This is a
concrete, near-term schema risk worth flagging before any of these packs get their first real
salary figures encoded.

### 15.2 EU AI Act: Codex's "candidate-side, needs counsel" framing is reasonable but incomplete — and the more specific check is good news

Both Codex documents state that the EU AI Act treats employer-side recruitment/selection systems
as high-risk (Annex III), that AutoTime is candidate-side, and that this needs counsel review.
That's correct as far as it goes, but neither document checked the two things that actually bear
most directly on a product whose subject matter is migration eligibility, not just recruitment:

1. **Annex III does not stop at recruitment.** Point 7 of Annex III separately designates AI
   systems used for migration, asylum and border-control purposes as high-risk — including,
   specifically, "AI systems intended to assist ... in the examination of applications for asylum,
   visa or residence permits ... including related assessments of the reliability of evidence."
   That description sounds close to what AutoTime's mobility-assessment engine does. Direct
   verification of this category's actual scope, however, finds it is explicitly limited to systems
   "intended to be used **by competent public authorities**" — i.e., government immigration bodies
   examining real applications, not a private tool helping an individual candidate understand their
   own situation before they apply anywhere. On the specific wording found, this is a meaningfully
   reassuring result: AutoTime's candidate-facing mobility guidance does not appear to sit inside
   this category on its face. **This is not a legal conclusion** — "used by a public authority" is
   exactly the kind of boundary condition (e.g., if a future feature routed structured output
   directly into a government submission channel) that genuinely needs counsel to confirm stays
   inapplicable as the product evolves — but it is a specific, sourced, decision-relevant data point
   neither Codex document surfaced despite it being the single most on-point Annex III category for
   this specific product's subject matter.
2. **Article 6(3)'s "profiling override"** (a system that profiles natural persons is always
   high-risk, no self-assessment exemption available) is real and absolute — but, per direct
   verification, it only activates for a system that already falls within an Annex III area to
   begin with. It is not a freestanding trigger. Given point 7 (above) appears not to apply and
   point 4(a) (recruitment/selection) is scoped to employer-side use Codex already correctly
   excludes AutoTime from, the profiling override does not appear to independently pull AutoTime
   into Annex III on the evidence found in this pass — worth confirming with counsel rather than
   treating as settled, but not a new alarm.
3. **The UK IAA's criminal-offence claim, independently re-verified:** unregulated provision of
   immigration advice in the UK is confirmed, via direct search of UK legislation guidance
   (Immigration and Asylum Act 1999, Sections 84/91), to be a real criminal offence — up to two
   years' imprisonment on indictment. Codex's caution here was not overstated; if anything this
   independent check raises confidence in it.

### 15.3 What to do with this

None of this changes Section 6's recommendation — obtain a written jurisdiction-specific scope
opinion before any personalized UK output, and before treating any EU country's guidance as more
than general information. What it changes is the specific brief to hand counsel: ask them to
confirm (a) that Annex III point 7's "competent public authorities" limitation does in fact exclude
a candidate-facing self-assessment tool as currently scoped, and (b) whether that conclusion would
change if a future feature ever submitted structured output into an official government channel on
a candidate's behalf. That's a narrower, cheaper, more answerable question than an open-ended "is
this high-risk AI" review, and it's the direct product of pushing Codex's already-correct caution
one level deeper rather than either accepting or dismissing it wholesale.

## Sources

Repository files cited throughout this report were read directly during this session; line numbers
and function names are as of 10 September 2026. External sources for Section 7 (competitor claims):

- [jackandjill.ai](https://www.jackandjill.ai/)
- [TechCrunch, "Jack & Jill raises $20M/$50M to bring conversational AI to job hunting," Oct 2025](https://techcrunch.com/2025/10/16/jack-jill-raises-50-million-to-bring-conversational-ai-to-job-hunting)
- [JobRight.ai review, favtutor.com](https://favtutor.com/jobright-ai-review/)
- [Deel: "Deel Mobility is now open to all companies and workers"](https://www.deel.com/blog/deel-immigration-open-to-individuals/)
- [Deel Visa Eligibility Checker](https://www.deel.com/blog/best-tools-to-check-employee-visa-eligibility/)
- [Boundless Immigration press release, Localyze acquisition, Oct 2025](https://www.boundless.com/press/boundless-acquires-european-mobility-leader-localyze-creating-a-unified-solution-to-navigate-global-workforce-challenges)
- [Localyze](https://www.localyze.com/)

For Sections 6, 9, 10 and the dossier's regulatory/evaluation/IP citations: see
`docs/reports/startup-moat-rd-dossier-2026-09-10.md`'s own footnotes — read and assessed critically
in this report (Section 12) but not independently re-fetched in this pass.

External sources for Section 15 (direct re-verification, added after the founder lifted the time
constraint):

- [Aventys: "Talent salarié qualifié vs carte bleue européenne 2026"](https://aventys.work/fr/blog/passeport-talent-salarie-qualifie-vs-carte-bleue-europeenne)
- [Relovisa: "Talent Salarié Qualifié vs EU Blue Card France 2026"](https://relovisa.co/blog/france-talent-salarie-vs-eu-blue-card-2026)
- [Newland Chase: "Sweden Work Permit Reform in Force from June 1, 2026"](https://newlandchase.com/sweden-work-permit-reform-in-force-from-june-1-2026/)
- [Swedish Migration Agency: EU Blue Card](https://www.migrationsverket.se/en/you-want-to-apply/work/employee-or-self-employed/eu-blue-cards.html)
- [UK Government: IAA adviser registration explained](https://www.gov.uk/government/publications/iaa-adviser-registration-explained/iaa-adviser-registration-explained)
- [Legislation.gov.uk: Immigration and Asylum Act 1999, Part V](https://legislation.gov.uk/ukpga/1999/33/section/91/data.html)
- [artificialintelligenceact.eu: Annex III, Article 6](https://artificialintelligenceact.eu/annex/3/) · [Article 6](https://artificialintelligenceact.eu/article/6/)
- [Airia: "The Article 6(3) Filter: Your Escape Valve Has a Catch"](https://airia.com/eu-ai-act-part-3-the-article-63-filter-your-escape-valve-has-a-catch/)
- [AI Act Service Desk (European Commission): Migration, asylum and border control management](https://ai-act-service-desk.ec.europa.eu/en/migration-asylum-and-border-control-management)
- [Multiplier: "Initiate visa process during onboarding"](https://help.usemultiplier.com/hr/immigration/visa/initiate-visa-process-during-onboarding)
- [Remote.com: "What is a pre-employment eligibility check for EOR clients?"](https://support.remote.com/hc/en-us/articles/31105190595085-What-is-a-pre-employment-eligibility-check-for-EOR-clients)
