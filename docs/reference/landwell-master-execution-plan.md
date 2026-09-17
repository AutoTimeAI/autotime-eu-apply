# LandWell Master Execution Plan

**Prepared:** 16 September 2026, by Claude Code, consolidating and superseding-by-reference three prior documents into one actionable plan.
**Status:** Founder-owned execution plan. Consolidates decisions already made, states the current technical reality verified against live code, and sequences the work to earn the right to make real claims.
**Supersedes nothing on its own authority** — it consolidates, it doesn't override, `docs/reference/landwell-product-brand-decision.md` and `docs/reference/landwell-tech-system-validation-plan.md`. Where this document summarizes them, treat those two as the source of record for exact wording.

---

## 1. The mission, stated plainly

Prove that LandWell's decision engine genuinely helps a specific, real group of tech candidates make better cross-border application decisions — with real evidence, not synthetic tests or architectural completeness — and only then earn the right to say so publicly. Everything below exists to answer one question honestly: **does this work, for whom, and how do we know?**

This is not a rebrand project, not a domain-shopping project, and not a feature-building project. Those are all real sub-tasks, but none of them is the mission. The mission is evidence.

## 2. What's actually decided (don't re-litigate these)

| Decision | Status | Source |
|---|---|---|
| Product brand | **LandWell** | `landwell-product-brand-decision.md` |
| Legal entity | AutoTime AI Ltd. — unchanged | same |
| Sector scope | **Tech professions, deliberately, for this phase** — healthcare/other sectors are a real future direction, not a current commitment | same, sector-scope addendum |
| Domain | Not purchased. `landwell.tech` is a live, honest option given the sector-scope decision; `landwellhq.com`/`mylandwell.com` remain the sector-neutral fallback if the founder wants to hedge. `landwell.com`, `.io`, `.eu`, `getlandwell.com` are confirmed unavailable. | `landed-naming-validation-findings.md`, brand-decision doc |
| Legal/trademark clearance | **Not done.** Preliminary web/registry screens only — no UKIPO/EUIPO search, no attorney opinion. Required before material public investment. | both docs |
| Core product pillars | EU Fit → evidence integrity → application preparation, organized around one continuous record: vacancy → decision → evidence review → application kit → approval → submission → interview → outcome | `core-foundation-execution.md` |
| Explicitly forbidden claims, permanently | "Increases interviews or hiring likelihood," guaranteed sponsorship/visa outcomes, equal depth across all markets without evidence | `core-foundation-execution.md`, validation plan's claim ladder |

## 3. What's actually true in the codebase right now (verified today, not assumed)

This section exists because architectural capability and real-world validity are different things, and conflating them is the exact mistake this whole plan exists to prevent.

**Real and live for every user today:**
- Vacancy parsing (`extractJob`, paste-only — the product does not fetch/scrape URLs), role/skill fit scoring (`evaluateAutoTimeFitScore`), and the international/mobility decision composition (`assessInternationalJob` + `orchestrateJobDecision`, via `decision-adapter.ts`) — genuine heuristic logic, not stubs.

**Real, wired, but practically dormant for real users:**
- Decision persistence (`mobility_decision_records`), correction/disagreement capture, and comprehension capture ("is this clear?") — all real, non-stub UI and backend code (built and applied to production earlier today), but all depend on a `mobilityDecisionId` that's only created when `MOBILITY_GOVERNANCE_ENFORCEMENT_ENABLED=true`. That flag defaults `false`. **Zero real decisions have been recorded to date.**

**A real risk, not yet fixed:**
- That same flag doesn't just enable recording — it also activates a cross-check against `mobility_country_readiness_snapshots`, which is completely empty. Turning it on today would force **every foreign-candidate decision** to `"Insufficient evidence"` (traced precisely: `missingGovernanceReadiness.outputPermission = "blocked"` → `orchestrateJobDecision`'s blocked branch). Native-candidate decisions are unaffected — this specifically breaks the mobility feature's own core audience.

**Tech-specificity, precisely scoped (relevant to the sector-scope decision):**
- Generic, no cost to keep deciding tech-first: the occupation-module contract, the live ESCO API, ATS integrations, country-pack categories.
- Hardcoded as reusable data: the one `tech-fintech` occupation module and its ESCO fixture — expanding later means adding a module, not rewriting one.
- Hardcoded in logic, the one real future cost: `role-pathways.ts`'s scoring gates and preference-matching keywords are literal tech category names, not a generic per-sector lookup. Not urgent now; will need generalizing before a second sector is added.

**Existing automated tests don't substitute for real-world validation:**
- `scripts/decision-quality-evaluation.test.mjs` — 32 cases, entirely synthetic hand-built strings, asserting the rules engine matches labels the test author chose. Real regression coverage. Zero evidence about real vacancies, real candidates, or real outcomes.

**No UI exists yet for most of the reviewer/governance workflow:**
- Only the corrections-review admin page is live and in nav. Expert sign-off, rule-bundle staging/activation, and source review are backend-only routes with no UI at all.

## 4. The one code change that unblocks everything else

Before any real-vacancy validation cycle can capture real data, the flag coupling in §3 has to be fixed — not with new infrastructure, with a small, targeted split:

- Keep `MOBILITY_GOVERNANCE_ENFORCEMENT_ENABLED` controlling the cross-check/blocking behavior — **leave it off** during the pilot.
- Add a second, narrower path (e.g. a `MOBILITY_DECISION_RECORDING_ENABLED` flag or equivalent) that only calls `appendGovernedMobilityDecision` to write the decision + replay-input record, without touching `combined.decision` or blockers.
- Files: `apps/web/platform/application-preparation/decision-adapter.ts`, `apps/web/platform/application-preparation/mobility-governance-repository.ts`, `apps/web/app/api/ai/content/route.ts`, `.env.production.example`.
- Verification: a test request produces an identical user-facing decision with the flag on vs. off, but a new row appears in `mobility_decision_records` when it's on. Re-run `scripts/mobility-*.test.mjs` (163 tests) and `scripts/decision-quality-evaluation.test.mjs` unchanged afterward.

This is a small change with an outsized unlock: once it lands, the correction UI, the comprehension UI, and real decision capture all become reachable — without changing anything a real candidate currently sees.

## 5. The validation methodology (full detail lives in `landwell-tech-system-validation-plan.md`)

Condensed to the sequence that matters:

1. **Pick one slice, from evidence, not preference** (§3 of the validation plan) — one tech role family (software engineering? data engineering? cybersecurity?) and one country corridor, chosen only after 8–12 real candidate interviews plus real vacancy-volume review. **This is the next open decision, and it's the founder's to make** — no amount of further codebase auditing substitutes for those interviews.
2. **Build a real, 30–50 case evaluation set** from actual dated vacancies in that slice, deliberately including hard cases (contradictory sponsorship signals, ambiguous employer identity, missing salary, etc.) — stored access-controlled, not in the public repo, with only anonymised summaries tracked here.
3. **Get independent, blind reviewer labels** — a domain reviewer plus, where legal/pathway correctness matters, a qualified mobility/employment specialist. If no qualified reviewer is available, the evaluation is restricted to cautious signal-detection, not legal correctness — per the validation plan's own fallback rule. For the *first* cycle, this doesn't need new admin UI — an offline spreadsheet satisfies it.
4. **Run the actual product end-to-end** against every case (not just the underlying functions) and classify every failure using the plan's taxonomy (critical false certainty → jurisdiction/entity errors → unsupported legal conclusions → role-domain failures → UX/workflow failures), repairing in that order.
5. **Recruit 3–5 real pilot users** in the chosen slice, observe real decisions, and measure comprehension, behavior change, and — critically — actual payment commitment, not praise.
6. **Only then evaluate against the stated gates**: zero critical false-certainty errors, ≥90% agreement with the reference judgment on answerable cases, ≥4/5 pilot users can explain the decision unprompted, ≥2 non-founder users make a real payment.
7. **Use the claim ladder** — today's honest claim is "cross-border application decision support with tech-oriented examples." Nothing stronger is earned until the gates above are met, and even then, only for the tested slice — not "all tech roles."

## 6. Sequencing — the concrete near-term order

| Step | What | Depends on |
|---|---|---|
| 1 | Land the flag split (§4) | Nothing — can start immediately |
| 2 | Run 8–12 candidate interviews; pick the first role-family + corridor slice | Founder's own outreach/network, not engineering |
| 3 | Assemble the 30–50 case evaluation set for that slice | Step 2 |
| 4 | Get independent reviewer labels (offline artifact is fine for cycle one) | Step 3; a reviewer for legal/pathway correctness, ideally lined up in parallel with step 2 |
| 5 | Run the real end-to-end evaluation, fix failures in taxonomy order | Steps 1, 3, 4 |
| 6 | Recruit and run the 3–5-user priced pilot | Step 5 reaching an acceptable baseline |
| 7 | Evaluate against the gates; record a dated GO/HOLD/NO-GO claim decision | Step 6 |

Domain purchase and any visible rebrand work can happen in parallel with steps 1–4 — the validation plan is explicit that it "must not depend on a domain choice." Don't let domain bikeshedding compete for time against step 2, which is the actual bottleneck only the founder can move.

## 7. Open decisions that are the founder's, not engineering's

1. Which role-family + corridor to validate first (needs real interviews — see §6 step 2).
2. Whether a qualified mobility/employment-law reviewer is available; if not, the evaluation scope narrows per the plan's own fallback.
3. Time/effort budget — the validation plan's own estimate is 8–16 weeks end to end for one slice done properly; confirm this pace is acceptable before starting.
4. Final domain choice (`landwell.tech` vs. a sector-neutral `.com`) — a real but low-stakes decision now that the sector-scope question is settled; doesn't block anything else.
5. Whether to run the flag-split code change now (§4) or hold it until the interview/slice-selection work (§6 step 2) is further along — both orders are valid; the code change has no expiry, so sequencing is a matter of founder preference, not a technical constraint.

## 8. Cross-session note, for awareness

This plan was assembled by Claude Code after finding that Codex, working independently in a separate concurrent session today, had already produced the brand decision and validation-plan documents this consolidates. Both sessions converged on the same brand and the same "prove it before claiming it" philosophy without coordinating. Worth deciding which session/tool is the founder's primary thread going forward, simply to stop paying the coordination cost of two AI agents doing overlapping strategic work on the same day.
