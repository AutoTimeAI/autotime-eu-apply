# AutoTime EU Apply: Moat R&D Synthesis and Execution Decision

**Date:** 10 September 2026
**Status:** Proposed execution decision — supersedes any single report below as the thing to act on
**Reconciles:**

1. `docs/reports/moat-rd-strategy-2026-09-10.md` (Codex)
2. `docs/reports/startup-moat-rd-dossier-2026-09-10.md` (Codex)
3. `docs/reports/european-tech-mobility-market-rd-2026-09-10.md` (Codex)
4. `docs/reports/claude-code-independent-moat-rd-2026-09-10.md` (Claude Code, including its
   Section 15 addendum)

**What this document is not:** a fifth research report. It does not re-argue positions the four
source reports already converge on. It states what to believe, what to build first, what to freeze,
what to stop, and who owns each remaining open question — per the handoff brief's own instruction
that "the synthesis — not either individual research report — should become the proposed execution
decision."

---

## 1. Where all four reports agree (settled, not re-litigated here)

- **Thesis:** AutoTime should be a governed cross-border application decision and evidence system
  for technology professionals, not a broader AI job-search suite. All four reports converge on
  this independently.
- **Beachhead:** Germany + Netherlands, independently converged on by every report that addressed
  the question, from different evidence (Eurostat Blue Card volume, IND's verifiable sponsor
  register, and this session's own direct source-fetching). This is the single most
  cross-validated conclusion in the whole body of research.
- **The ten-capability framework** is the right lens for "is there an operational moat," not just a
  features list.
- **Deterministic-vs-LLM boundary:** rule values, thresholds, and eligibility gates must be typed
  and deterministic; LLMs are for extraction, normalization, and drafting only, never for recalling
  a current threshold or producing a final decision.
- **The UK is a separate, regulated workstream**, not a fifth EU corridor — confirmed independently
  by every report and by this session's own direct re-verification of the underlying criminal
  offence (Section 15.2 of the Claude Code report).
- **Regulatory permission and paid repeat use are the two existential proofs**, and neither can be
  produced by more engineering alone.

## 2. Where the reports actually disagree, and the reconciled call

| Disagreement | Codex position(s) | Claude Code position | **Reconciled call** |
| --- | --- | --- | --- |
| How much of the ten-capability foundation exists | 15-25% technical foundations, <10% full system | 3/10 present, 2/10 partial, 5/10 missing — but some of the "present" 3 include code that is unreachable in production (`getDecisionBrief`, `createEvidenceRecords`) and one capability (`assessCoreLoopTrace`, feeding immutable-record integrity) is correct but has zero callers anywhere | **Use Claude Code's file-level numbers with the reachability caveat.** The headline percentage is directionally the same either way; the actionable difference is that some "existing foundation" needs *wiring*, not *building*. Treat wiring `assessCoreLoopTrace` into a live path as the literal first engineering ticket (Section 4). |
| Ireland's priority tier | Codex startup dossier: "research corridor pending proof," same tier as UK. Codex market-rd doc: Ireland in "Validated expansion" (Wave 2), ahead of Austria/Denmark/Belgium. Claude Code: agrees with market-rd doc, disagrees with the startup dossier. | Wave 2, alongside France/Sweden | **Wave 2.** Two of three reports and this session's own direct source-fetching (Ireland fully sourced from `enterprise.gov.ie`, on par with Netherlands) support this; the one dissenting report gave no country-specific evidence for holding Ireland back, only a general caution that applies more precisely to the UK's separate advice-regulation problem, not to Ireland's ordinary EU/EEA status. |
| Is the EU AI Act's recruitment category (Annex III 4(a)) the most relevant one to review? | Both Codex documents discuss only 4(a) (recruitment/selection, employer-side) | No — Annex III point 7 (migration/asylum/visa examination) is the more on-point category for this product's actual subject matter, and neither Codex document checked it | **Route counsel's brief through point 7's "competent public authorities" scoping question specifically** (Claude Code report, Section 15.2), not just the recruitment-category question Codex framed. This is additive to Codex's regulatory work, not a rejection of it. |
| Single salary threshold per country vs. route-scoped thresholds | Codex's dossier and market-rd doc both design route-scoped `policy_rule_versions`/country packs in the abstract | Confirmed with fresh, concrete evidence: France and Sweden each have two live routes with materially different thresholds (Section 15.1) | **Confirmed, not disagreed — this is Claude Code providing evidence for a Codex design choice that was previously argued from principle alone.** Treat as settled and higher-confidence than before. |
| Is there a live, named competitive threat to rank-2 of the moat? | Neither Codex document names one | Yes — Deel Mobility, live, individual-facing, human-reviewed | **Adopt Claude Code's finding.** This is new information, not a disagreement to arbitrate; it should change the urgency framing in every one of the four reports' timelines, none of which currently accounts for it. |

## 3. The ten capabilities: chosen, deferred, or rejected

Per the handoff brief's explicit instruction to "choose or reject each of the ten capabilities,"
not merely re-describe them:

| # | Capability | Decision | Why |
| --- | --- | --- | --- |
| 1 | Versioned mobility sources | **Chosen — build in Phase 1** | Unanimous across all four reports; no repository shortcut exists. |
| 2 | Source-change detection | **Chosen — build in Phase 1, scoped down initially** | Unanimous. Scope the first version to the Germany/Netherlands source set only (a handful of pages), not a general-purpose crawler — Codex's own source-class table already prescribes different cadences per source type, which argues against building one generic system first. |
| 3 | Immutable decision records | **Chosen — extend what already exists, don't rebuild** | `job_workflow_analysis_snapshots` is already genuinely append-only and live (Claude Code report, Section 2). The work here is *binding* snapshots to policy/source-revision IDs (Codex's canonical decision contract), not building append-only storage from scratch. |
| 4 | Employer/sponsor verification | **Chosen — extend the existing Stamp4 integration's country coverage before building new register adapters** | A real, live, governed integration already covers 4 countries (UK/Ireland/Netherlands/Germany) — exactly the Wave 1 + half of Wave 2 markets. Extending its coverage is cheaper than Codex's proposed general entity-resolution system, and should be tried first. |
| 5 | Candidate evidence provenance | **Chosen — deepen the live model, formally deprecate the dead one** | The live per-fact `evidenceStatusSchema` (verified/user_declared/inferred/unknown/missing/conflicting/stale) is real and reachable. `evidence-records.ts`'s parallel implementation is dead code against a legacy type shape and should not receive further investment — mark it for deletion alongside the rest of `DashboardExperience.tsx`'s dead "jobs" tab (already recommended in `docs/reference/technical-debt.md`). |
| 6 | Claim-to-evidence links | **Chosen — add source-span anchoring to the existing mechanism** | The link-or-flag mechanism is live and enforced (`assessClaimSupport`, `assessDraftEligibility`). The gap is stable position-anchored spans into source documents, which is an additive enhancement to something working, not new infrastructure. |
| 7 | Decision replay | **Chosen — Phase 1, but sequenced after #1 and #3** | Cannot be built before versioned sources and policy-bound snapshots exist; both other Codex documents place it correctly in this position. |
| 8 | Correction/disagreement capture | **Chosen — fix the dead call site first, then add the taxonomy** | `fact_correction` tracking is live; `decision_override` tracking exists but its only call site is dead code (confirmed by direct trace). Before investing in Codex's proposed correction taxonomy (`extraction_error`/`stale_source`/`wrong_rule`/etc.), first make sure the *live* surface (`JobApplicationWorkspace`, not the dead `DashboardExperience` tab) has an equivalent override-tracking call site at all. |
| 9 | Country readiness scores | **Deferred, not rejected** | Genuinely depends on #1, #2, and a populated scenario corpus existing first — building a "readiness score" from data that doesn't exist yet would produce a fake number, exactly the failure mode this whole product exists to prevent. Revisit once Wave 1's source-versioning and scenario corpus are real. |
| 10 | Expert sign-off records | **Chosen — schema now, review workflow later, per Codex's own sequencing note** | `docs/reference/jurisdiction-signoff-log.md` (added same day) is the correct interim scaffold — a deliberately empty tracking document, not a claim that review has happened. Design the queryable schema (Codex's `expert_signoffs` table shape) during Phase 1 so the log's eventual replacement doesn't require a second migration; the review *workflow*/UI can wait for Phase 3. |

**Net:** 8 of 10 chosen for near-term investment, 1 deferred (readiness scores, for a principled
reason — no fake numbers), 0 rejected outright. This differs from a naive reading of "3
present/2 partial/5 missing" only in sequencing, not in scope: every capability earns its place, but
several should be built by *extending something live* rather than by designing something new from
the ten-entity schema Codex proposed in full.

## 4. Frozen first vertical slice

Codex's proposed slice ("one Netherlands Highly Skilled Migrant scenario, one versioned official
source, one employer verification, one candidate evidence set, one immutable decision, one replay
test, one expert sign-off record") is the right shape. Freezing it with two amendments:

1. **Add the wiring fix as slice item zero.** Before any new schema work, wire
   `assessCoreLoopTrace` into a real path — either a release-time integrity check across live
   application records, or a user-facing "your application history is consistent" signal in
   `JobApplicationWorkspace`. This costs a day, not a sprint, uses code that already exists and is
   already tested, and produces the first real operational signal about whether the target
   architecture's core-loop-integrity concept holds up against live data before committing further
   schema design time to it.
2. **Run the slice against both Netherlands and Germany in parallel, not Netherlands alone.**
   Every report agrees Germany + Netherlands is the beachhead pair; proving the architecture against
   only one of the two doesn't validate that it generalizes across the pair's genuinely different
   rule shapes (Netherlands: sponsor-entity verification-led; Germany: salary/qualification-rule-led,
   deliberately not hardcoded per `country-packs/germany.ts`'s own existing design comment). A
   one-country slice risks an architecture that only fits the country it was built against.

**Frozen slice, final form:** wire `assessCoreLoopTrace` → one Netherlands Highly Skilled Migrant
scenario and one Germany EU Blue Card scenario, each with one versioned official source, one
employer/sponsor verification (extending the existing Stamp4 integration, not building new), one
candidate evidence set, one immutable decision snapshot bound to policy/source-revision IDs, one
replay test, and one expert-sign-off schema record (interim: a row in
`jurisdiction-signoff-log.md`, explicitly not fabricated).

## 5. Migration and evaluation gates

Adopting Codex's dual-write → shadow-mode → backfill → read-switch migration sequence and
consequence-specific error thresholds (false-green zero-tolerance, unsupported-claim zero-tolerance,
false-red under 2%) without modification — no repository or research evidence in any of the four
reports argues for a different approach. Two gate additions specific to this synthesis's findings:

- **Route-disambiguation gate:** before any country pack's salary threshold is exposed to a real
  user, confirm it is bound to a named route (not just a country), per Section 2's France/Sweden
  finding. A country pack that stores one threshold with no route field fails this gate regardless
  of how current the number is.
- **Dead-code gate:** before counting any of the ten capabilities as "built" in a release note or
  investor update, confirm its implementing code is reachable from a live route by the same
  hand-tracing method this report and its predecessor used — not by the function's existence, and
  not by which component file it lives in.

## 6. Ownership: engineering vs. founder/legal/expert/user-validation

| Action | Owner | Not closeable by engineering alone |
| --- | --- | --- |
| Wire `assessCoreLoopTrace`; extend Stamp4 coverage; build versioned sources/decision snapshots/replay for the frozen slice | Engineering | — |
| Confirm Annex III point 7's "competent public authorities" scoping, and whether a future submission-channel feature would change that | Legal/regulatory counsel | Yes — this is the single most concrete open item this synthesis produced |
| Written jurisdiction scope opinion for personalized UK output | UK immigration counsel | Yes |
| Named qualified reviewer + first sign-off for Netherlands and Germany routes in the frozen slice | Jurisdiction experts (contracted) | Yes |
| Five concierge decisions, three completed payments (Codex's Day-0-30 gate) | Founder-led | Yes — no engineering deliverable substitutes for this |
| Appropriate-reliance study (12-20 users, correct vs. flawed recommendations) | Founder/product research | Yes |
| DPIA before any production mobility data flows | Privacy/security owner (fractional acceptable initially) | Yes |
| Decide whether Deel's existence changes pricing or positioning | Founder | Partially — engineering can surface the finding (done, Section 7 of the Claude Code report), the pricing/positioning call is the founder's |

## 7. What changed since the four source reports were written

All four reports were written the same day, in the same session, by different actors working
partially in parallel — worth recording precisely what's now true that none of them assumed:

- Gate 19 (one continuous E2E journey, capture → decision → application → interview → outcome) is
  closed, with a real Playwright spec proving the live pipeline connects end to end
  (`tests/e2e/37-continuous-application-journey.spec.ts`).
- A live bug in `orchestrateJobDecision` that was silently blocking application-kit generation for
  every candidate with a clean fit review has been found and fixed (commit `4a4dc6e3`) — this
  predates and is independent of any of the four R&D reports, but materially affects how much of
  the live decision pipeline can be trusted today.
- AI-assisted application-kit generation shipped in the live `JobApplicationWorkspace` (commit
  `6f6e4699`), reusing the existing `prepareApplicationKit` pipeline rather than building a second
  one — a concrete, positive example of the "wire what exists" pattern this synthesis recommends
  applying more broadly.
- A parallel session appears to have already begun unifying the two independent decision paths this
  session's own technical-debt audit flagged (`resolveAssessmentCountry`, `vacancyRejectsSponsorship`
  shared helpers now present in both `decision-adapter.ts` and `job-application-workflow.ts`,
  observed via file-change evidence mid-session, not yet independently re-verified in full).

None of the four source reports' headline recommendations change because of this — but a founder
reading only the source reports would not know the product's live decision engine had a real
correctness bug fixed the same day their moat was being assessed. Recording it here so the
synthesis, not any single report, carries the current state forward.

## 8. Open questions still needing a founder decision

Per the handoff brief's completion standard ("an unresolved gap must not disappear into generic
caveats"):

1. **Approve or reject the frozen vertical slice (Section 4) as written**, including the
   two-country amendment.
2. **Commission the specific, narrowed counsel question from Section 5's regulatory addition**
   (Annex III point 7 scoping) rather than a general "is this high-risk AI" review — cheaper,
   faster, and more answerable.
3. **Decide whether Deel's existence (Section 2 of this document) changes near-term pricing or
   positioning** before the Days 31-60 commercial-validation work Codex's dossier proposes.
4. **Approve the "wire before you build" sequencing** for capability #3 and #8 specifically — this
   is a real, if small, deviation from Codex's proposed engineering order (Section 591 of the
   dossier), and the founder should explicitly sign off on reordering it rather than have it happen
   implicitly.
5. **Assign an owner for the dead-code cleanup** already recommended in
   `docs/reference/technical-debt.md` (deleting `DashboardExperience.tsx`'s unreachable "jobs" tab
   and `activeFocus === "application-answers"` block) — this synthesis's capability-5 decision
   depends on that cleanup actually happening, not just being documented as a recommendation.

---

*This document should be treated as current until either new repository evidence contradicts a
specific claim above (cite the file and re-trace, don't just re-describe) or a founder decision in
Section 8 changes the plan. Update in place rather than producing a fifth parallel report.*
