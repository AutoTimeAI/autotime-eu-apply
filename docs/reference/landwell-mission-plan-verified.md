# LandWell mission plan — verified, start to finish

**Prepared:** 16 September 2026, by Claude Code.
**Status:** Founder-owned. Every factual claim below was checked against the live codebase and git state today, not carried forward from an earlier doc on trust. Where this supersedes a claim in `landwell-master-execution-plan.md`, `landwell-product-brand-decision.md`, or `landwell-tech-system-validation-plan.md`, this doc says so explicitly and those docs should be treated as historical record, not current status.
**Purpose:** one place that states the mission, what's actually true in the code right now, and the exact sequence from here to a real GO/HOLD/NO-GO claim decision — so no further re-auditing is needed to pick up this thread.

---

## 1. The mission, stated plainly

Prove that LandWell's decision engine genuinely helps a specific, real group of tech candidates make better cross-border application decisions — with real evidence, not synthetic tests or architectural completeness — and only then earn the right to say so publicly.

This is not a rebrand project, not a domain-shopping project, and not a feature-building project. The mission is evidence. Nothing below is done until real candidates, not code, have confirmed it works.

## 2. Decisions already made (don't re-litigate)

| Decision | Status |
|---|---|
| Product brand | **LandWell** |
| Legal entity | AutoTime AI Ltd. — unchanged |
| Sector scope | Tech professions, deliberately, for this phase. Healthcare/other sectors are a real future direction, not a current commitment |
| Domain | Not purchased. `landwell.tech` confirmed available and chosen; `mylandwell.com`/`landwellhq.com` confirmed available as sector-neutral fallbacks. `landwell.com` and `landwell.io` confirmed taken. **Purchase itself has not happened.** |
| Legal/trademark clearance | Not done. Preliminary web/registry screens only — no UKIPO/EUIPO search, no attorney opinion. Required before material public investment |
| Explicitly forbidden claims, permanently | "Increases interviews or hiring likelihood," guaranteed sponsorship/visa outcomes, equal depth across all markets without evidence |

## 3. What's actually true in the codebase right now — verified today

This is the section that matters most, because it corrects real drift between what earlier session notes claimed and what the tree actually contains.

### 3.1 Live and real for every user today
- Vacancy parsing (`extractJob`, paste-only — no URL fetch/scrape), role/skill fit scoring (`evaluateAutoTimeFitScore`), and mobility decision composition (`assessInternationalJob` + `orchestrateJobDecision` via `decision-adapter.ts`) — genuine heuristic logic, not stubs. Confirmed unchanged.

### 3.2 Built, but not committed, not deployed, not applied — corrects §3 of the master plan
The master plan states the governance flag split was "built and applied to production earlier today." **That is no longer accurate.** As of this audit:
- The flag-split code (`decision-adapter.ts`, `mobility-governance-repository.ts`, `app/api/ai/content/route.ts`, `.env.production.example`) exists only as **uncommitted local modifications** — not in any git commit, not pushed, not deployed.
- The migration that makes decision recording actually work (`supabase/migrations/20260916120000_seed_pilot_observation_rule_bundle.sql`) exists as a file but is **untracked in git and unapplied in Supabase**. Until it's run, `mobility_decision_records` inserts fail their NOT NULL foreign key silently no-op (by design — this was built to fail safe).
- Net effect: **zero real decisions have been recorded, and cannot be, until (a) this work is committed/pushed/deployed and (b) the migration is applied.**
- Everything from today's session — the flag split, the migration, `scripts/real-vacancy-evaluation.test.mjs` + its case corpus, `scripts/export-blind-review-artifact.mjs`, and this document's three siblings — is real, tested, and correct, but **at risk of being lost** if the working tree is discarded before a commit happens. `git status` currently shows on the order of 150 modified/untracked files.

### 3.3 The risk this flag split was built to prevent — still correctly prevented
`MOBILITY_GOVERNANCE_ENFORCEMENT_ENABLED` still independently controls the cross-check against `mobility_country_readiness_snapshots` (still completely empty). Turning that flag on today would still force every foreign-candidate decision to `"Insufficient evidence"`. The new `MOBILITY_DECISION_RECORDING_ENABLED` path is confirmed, by a passing regression test, to never touch `combined.decision`/blockers. This property is real and verified — `scripts/decision-adapter-recording-flag.test.mjs` (3/3 passing) and `scripts/real-vacancy-evaluation.test.mjs` (2/2 passing) both ran clean today.

### 3.4 Real-vacancy evaluation plumbing — built, small, honest about its size
- `scripts/real-vacancy-evaluation-cases.mjs`: **2 real, verbatim-captured postings** (MOTOR Ai Berlin, Emma Frankfurt), not the 30-50 case corpus the validation plan needs. Self-labeled as a starter set.
- `docs/investigations/blind-review-artifact.csv` / `-engine-output.csv`: exist, 2 rows each, matching the corpus size, unreviewed (empty `reviewer_label` cells) — this is expected, no reviewer has been recruited yet.
- This plumbing is genuinely done and won't need rebuilding — the moment a real slice is chosen and a 30-50 case corpus exists, the same scripts run against it unchanged.

### 3.5 Sector-specificity hardcoding — confirmed, precisely scoped
`packages/shared/src/role-pathways.ts` contains literal tech-category string keys (`"cybersecurity"` at line 192, `"ai-data-science"` at line 216, category arrays like `["software", "web", "ai", "data-engineering"]` at line 505) used directly in scoring/preference-matching logic — not a generic per-sector lookup. Confirmed by direct read, not assumption. This remains the one real hardcoding cost of the tech-first decision: not urgent now, will need generalizing before a second sector is added.

### 3.6 The actual bottleneck — confirmed still at zero
`docs/investigations/slice-selection-interview-kit.md`'s scoring table is still fully blank — no interview has been recorded. This remains the one step that has to happen before steps 3 onward (real case corpus, reviewer labels, real evaluation, priced pilot) can start, and it is explicitly the founder's, not engineering's, to move.

## 4. What "done" looks like, end to end

The mission ends at a dated, evidence-backed GO/HOLD/NO-GO claim decision — not at a feature being built. The gates that decision is measured against:
- Zero critical false-certainty errors in the real evaluation set.
- ≥90% agreement between the engine and independent reviewer labels on answerable cases.
- ≥4 of 5 pilot users can explain the engine's decision unprompted.
- ≥2 non-founder users make a real payment.

Nothing before that point — not a working demo, not enthusiastic feedback, not architectural completeness — earns the right to publicly claim the product works.

## 5. The full sequence, start to finish

| Step | What | Status | Depends on |
|---|---|---|---|
| 0 | Commit and push today's uncommitted work (flag split, migration file, test harnesses, blind-review tooling, planning docs) | **Not done — recommend doing this before anything else, to stop risking loss of real work** | Nothing |
| 1 | Apply the seed migration in Supabase; deploy the flag-split code to production | Not done | Step 0 |
| 2 | Run 8–12 real candidate interviews; pick the first role-family + corridor slice | Not started (0 interviews recorded) | Founder's own outreach/network — not engineering |
| 3 | Assemble a real 30–50 case evaluation set for that slice | Not started (2-case placeholder exists, tooling ready) | Step 2 |
| 4 | Get independent, blind reviewer labels using `docs/investigations/blind-review-instructions.md` | Not started | Step 3; a reviewer, ideally lined up in parallel with step 2 |
| 5 | Run the real end-to-end evaluation; fix failures in the taxonomy's priority order (critical false certainty → jurisdiction/entity errors → unsupported legal conclusions → role-domain failures → UX/workflow failures) | Not started | Steps 1, 3, 4 |
| 6 | Recruit and run a 3–5-user priced pilot | Not started | Step 5 reaching an acceptable baseline |
| 7 | Evaluate against the §4 gates; record a dated GO/HOLD/NO-GO decision | Not started | Step 6 |

Domain purchase, trademark clearance, and any visible rebrand can happen in parallel with steps 1–4 — none of it blocks or is blocked by the validation sequence. Don't let it compete for time against step 2, the actual bottleneck.

## 6. What engineering can still do unprompted, and what it can't

**Can keep doing without waiting on the founder** (all genuinely unblocked, none of it substitutes for steps 2, 4, or 6):
- Expanding the real-vacancy case corpus with more real postings once a slice is known, or even sector-agnostic starter postings before then, for tooling verification only.
- Hardening the flag-split and recording path further if new edge cases are found.
- Generalizing `role-pathways.ts`'s hardcoded tech keywords, if a second sector becomes likely sooner than expected (§3.5).

**Cannot be substituted by engineering, at all:**
- The 8–12 candidate interviews (step 2) — this is a conversation only a human founder can have.
- Recruiting a qualified mobility/employment-law reviewer (step 4) — a sourcing task, not a code task.
- Recruiting and running the priced pilot (step 6) — requires real users and a real payment ask.

## 7. Immediate next actions, in order

1. **Commit and push today's work.** This is the single highest-leverage next action — it's the only item on this list that is purely reversible risk with no offsetting benefit to leaving it undone.
2. Apply `supabase/migrations/20260916120000_seed_pilot_observation_rule_bundle.sql` (DIY, per earlier instruction) and set `MOBILITY_DECISION_RECORDING_ENABLED=true` in production once ready to start capturing real pilot data.
3. Run the 8–12 slice-selection interviews using `docs/investigations/slice-selection-interview-kit.md`. Everything downstream is gated on this.

---

*Supersedes §3 and the "built and applied to production" claim in `docs/reference/landwell-master-execution-plan.md`; all other sections of that document remain accurate and this doc doesn't repeat them in full.*
