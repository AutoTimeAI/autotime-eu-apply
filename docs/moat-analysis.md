# AutoTime EU Apply — moat analysis

**Decision date:** 10 September 2026 (original); updated same day with a verified operational-moat
capability audit and real competitive research — see the two new sections near the end.
**Status:** Draft for founder/product review — not yet an approved governing document
**Companion to:** [product-core-investment-strategy.md](product-core-investment-strategy.md)
**Question this document answers:** given the three approved investment pillars, why couldn't a
well-funded competitor ship the same product in a quarter?

The investment strategy decides *what to build and in what order*. It does not decide *why it
would be hard to copy* — that question is not addressed anywhere in its ten pages, and the two
are genuinely different documents. This one exists to close that gap.

**Same-day update, read this first:** the original analysis below treated rank 2 (governed EU
mobility-source data) as something *a well-resourced competitor could eventually replicate*.
Real research done the same day found that one already has — see "Competitive reality check"
near the end. This doesn't invalidate the pillar; it changes the deadline.

## Executive answer

**There is no moat today.** What exists is a well-scoped, well-governed MVP. Two of its
components are moat *candidates* — one already partially real, one real only in the future,
conditional on execution the strategy has scheduled but not yet delivered. Everything else in
the product (categorical decisions, CV parsing, kit generation, the dashboard) is copyable by a
competent team in weeks and confers no durable advantage on its own.

## Candidate moat mechanisms, ranked by defensibility

| Rank | Mechanism | Compounds with | Status today | Verdict |
| --- | --- | --- | --- | --- |
| 1 | Outcome-calibrated decision engine (real decision → application → interview → offer data feeding back into EU Fit and mobility rules) | Users and time (data-network effect) | Not started — zero cohorts run; Phase 3 of the existing plan is the only place this is scheduled | **Moat-in-waiting.** Highest ceiling of anything in the product, and the one thing a fast-follower structurally cannot buy or copy — it requires real users and elapsed time, not engineering effort. Currently worth nothing because it doesn't exist yet. |
| 2 | Governed EU mobility-source data (per-country guidance, cited, freshness-tracked, named review owner) | All users of a given country (content moat) | Partially real — the strategy already requires source/jurisdiction/date/owner tracking | **Real but rented — and already contested.** Genuinely expensive to build *well* and to keep *honest*, and a careless fast-follower who copies it sloppily takes on real reputational and legal risk AutoTime has designed around. Originally written as "a well-resourced competitor *could* replicate this" — same-day research found one already has: Deel Mobility now offers individual candidates a visa-eligibility checker plus an assigned human mobility specialist per case, live today, not hypothetical. See "Competitive reality check" below. |
| 3 | Per-candidate evidence-integrity graph (claim → evidence → status, built up over a job search) | Nothing across users — resets per candidate | Live in the product today (evidence-integrity pillar) | **Real but modest.** A genuine switching cost — a candidate loses weeks of built-up evidence structure by leaving — but it is *personal*, not networked: my evidence graph doesn't make your recommendation better. A competitor's onboarding flow neutralizes most of this in one CV re-upload. |
| 4 | Categorical decision UX, "Unknown — verify" posture, conservative claim-blocking | Nothing | Live today | **Not a moat.** A defensible *design choice* and the right thing to build regardless, but any competent team can copy the pattern in weeks. Positioning, not defense. |

## What a fast-follower could and couldn't copy

| Component | Could copy in weeks | Could copy, but slowly and at real risk | Could not copy without years and real users |
| --- | --- | --- | --- |
| Apply/Investigate/Improve/Skip decision UX | Yes | | |
| CV parsing → structured evidence record | Yes | | |
| Vacancy-specific CV/cover-letter/kit generation | Yes | | |
| Claim-to-evidence linking and unsupported-claim blocking | Yes (the mechanism) | | |
| Governed mobility-source database, cited and freshness-tracked, per country | | Yes — needs a named compliance owner and sustained labor; sloppy copies are worse than no product | |
| Outcome-calibrated EU Fit / mobility rules (decision quality that improves from real recruiter/interview/offer outcomes) | | | Yes — needs a real cohort's outcomes over months, not engineering time |
| A specific candidate's accumulated evidence graph | | Partial — candidate has to redo it, but only takes one CV re-upload | |

The pattern: everything AutoTime can build *this quarter* is copyable in a quarter. The one thing
that isn't copyable on any engineering timeline is outcome-calibrated decision quality — and the
strategy has correctly identified this as the thing to instrument (Phase 1's "instrument the
funnel," the north-star metric, Phase 3's cohort work) without ever calling it the moat.

## What this means for priority, not just roadmap order

The existing strategy's phase sequence (compress and instrument → trust and preparation quality →
prove commercial and outcome value) is compatible with this analysis, but the *reason* for
prioritizing it changes:

- **Outcome instrumentation (Phase 1) is not a metrics nice-to-have — it's the only lever that
  builds rank-1 moat.** Every week without real decision → outcome data is a week the actual moat
  isn't being built, regardless of how many features ship.
- **Zero confirmed unsupported-claim incidents (existing acceptance gate) is not just a safety
  gate — it is the precondition for rank-2's trust-based defensibility.** One visible bad
  mobility-guidance incident doesn't just cost a user; it removes the reason a careful competitor
  couldn't also just wing it.
- **Country/scope breadth must stay bounded by compliance-labor capacity, not ambition.** Rank 2's
  defensibility depends on doing fewer countries *credibly* rather than more countries thinly —
  the existing non-goal ("supporting every European jurisdiction at equal depth") is doing more
  moat-protection work than the strategy document gives it credit for.
- **This is now time-pressured, not evergreen.** The "Competitive reality check" below confirms
  Deel already ships an individual-facing mobility eligibility checker with human review. The five
  not-found operational capabilities in the audit above (versioned sources, source-change
  detection, decision replay, country readiness scores, expert sign-off records) are what would
  make AutoTime's version durably better than a standalone checker rather than a slower copy of
  one — building those is no longer optional groundwork, it's the actual race.
- **Rank 3 (personal evidence graph) is worth strengthening for retention, not for defense against
  competitors.** Don't over-invest engineering time here expecting it to keep competitors out — it
  won't. It's a retention lever, not a moat.

## What would erode the moat that does exist

- Relaxing evidence-integrity discipline under delivery pressure (rank 2 and rank 1 both depend on
  a spotless trust record; one exception quietly granted is a precedent, not a one-off).
- Letting mobility-source guidance go stale faster than the review cadence catches it.
- Expanding country coverage faster than the named research/compliance owner can sustain
  jurisdiction-by-jurisdiction quality — this is the most likely way rank 2 gets diluted into
  "not actually better than a generic AI tool."
- Treating Phase 3's outcome cohort as optional or indefinitely deferrable. Rank 1 only exists if
  this actually runs.

## Metrics that would prove or disprove this analysis

Reuse the existing measurement framework rather than inventing a parallel one — the moat claim is
falsifiable against metrics already in the strategy:

- **Rank 1 is real once:** recruiter-response/interview/offer rate is observed across at least one
  full cohort, and there is a measurable difference in decision quality between candidates AutoTime
  has and hasn't seen outcomes for (the existing "Outcome" and "Trust" metrics, tracked over time
  rather than as a single snapshot).
- **Rank 2 is holding if:** confirmed unsupported material claims stay at zero (existing Safety
  metric) and country coverage documentation (sources, review owner, freshness) stays current
  rather than accumulating silent staleness.
- **Rank 3's retention value is real if:** the existing Retention metric ("candidates returning
  with a second role within four weeks") holds up specifically for users with an established
  evidence graph versus new users — if there's no difference, the personal-evidence switching cost
  isn't actually doing retention work either.

## Operational moat capability audit (verified 10 September 2026)

The "outcome-calibrated decision engine" (rank 1) and "governed mobility data" (rank 2) both
depend on specific *operational* capabilities, not just the product features that sit on top of
them. A separate conversation the same day named ten such capabilities as the real backbone of
either moat candidate. Checked directly against the codebase (file/function citations, not
assumption) rather than assumed present because they sound like they should exist:

| # | Capability | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Versioned mobility sources | **Not found** | `OfficialSourceCitation` (`packages/shared/src/international/types.ts`) holds one current `reviewedAt`/`ruleVersion` snapshot per source — no revision history. |
| 2 | Source-change detection | **Not found** | No hashing/diffing/monitoring of government source pages anywhere in the repo. |
| 3 | Immutable decision records | **Present** | `job_workflow_analysis_snapshots` (Supabase) is explicitly append-only, `unique(job_id, version)`, no update/delete RLS policy; mirrored client-side in `JobAnalysisResult.version`. |
| 4 | Employer/sponsor verification | **Partial** | Real live lookup via Stamp4's external API, but only for UK/Ireland/Netherlands/Germany — every other country falls back to user-asserted text. |
| 5 | Candidate evidence provenance | **Present** | Per-fact `evidenceStatusSchema` (verified/user_declared/inferred/unknown/missing/conflicting/stale) in `packages/shared/src/evidence/model.ts`. |
| 6 | Claim-to-evidence links | **Present** | `assessClaimSupport` requires linked evidence and returns an explicit unsupported/needs-confirmation state, never silent. |
| 7 | Decision replay | **Not found** | Snapshots store a past decision's *output*, not a pinned policy version to re-execute inputs against — no versioned rule engine exists. |
| 8 | Correction/disagreement capture | **Partial** | `fact_correction` tracking is live (reachable via `/dashboard/autofill-profile`); `decision_override` tracking exists in code but its only call site sits inside a `DashboardExperience.tsx` tab no live route ever renders — dead in production. |
| 9 | Country readiness scores | **Not found** | Only a binary `"full" \| "explorer"` tier exists — no graduated, computed score. |
| 10 | Expert sign-off records | **Not found** | No DB table or schema anywhere. The only artifact is `docs/reference/jurisdiction-signoff-log.md` — a markdown tracking doc, deliberately empty, not a queryable system. |

**Reading this against the ranking above:** 3 of 10 are genuinely built (records, provenance,
claim-linking) — real progress toward rank 1's prerequisite of trustworthy historical data. 2 are
partial. 5 are not built at all, including the two capabilities that would make rank 2 defensible
in the way the original ranking assumed (versioned sources, source-change detection) and the one
that would make rank 1 *provable* rather than merely claimed (decision replay). The gap between
"has evidence integrity" (true) and "has an operational moat" (not yet) is exactly these five.

## Competitive reality check (real research, 10 September 2026)

The original ranking above reasoned about what a competitor *could* do. This section reports what
real, named competitors *are already doing*, from direct web research the same day — not
assumption, and not the earlier draft's untested premise that no one else was doing this yet.

**AI job-search copilots — stay generic, none found doing jurisdiction-specific mobility:**

- **Jack & Jill** (jackandjill.ai) — conversational candidate agent, ~230,000 users, $20M raised,
  London-based. No jurisdiction-specific immigration/mobility guidance found in its product; the
  only visa-related material found concerns Jack & Jill's *own* hiring for its ~25-person team, not
  a candidate-facing feature. [jackandjill.ai](https://www.jackandjill.ai/) ·
  [TechCrunch, Oct 2025](https://techcrunch.com/2025/10/16/jack-jill-raises-50-million-to-bring-conversational-ai-to-job-hunting)
- **JobRight.ai** — has an "H-1B sponsorship" *filter/label* on job cards (US-specific), not a
  reasoned decision. $39.99/mo Turbo tier. No EU-jurisdiction coverage found.
  [JobRight review](https://favtutor.com/jobright-ai-review/)
- **Simplify.jobs** — same pattern: a binary "Sponsors H1B / Does not sponsor H1B" label, US-only,
  no evidence-linkage or reasoning behind the flag.
- **Teal, Huntr** — resume/tracker tools; no visa, mobility, or evidence-integrity features found
  at all.

This cluster validates one thing clearly: nobody in the direct "AI job-search copilot" category is
doing evidence-linked, jurisdiction-specific mobility reasoning. That part of rank 2 still holds.

**Mobility/immigration platforms — this is where the real threat is:**

- **Deel Mobility** — originally B2B (employer-side EOR/payroll), but Deel has *opened its
  immigration product to individuals*: a free Visa Eligibility Checker plus an assigned human
  mobility specialist per case, available with or without a Deel employment contract.
  [Deel: "Deel Mobility is now open to all companies and workers"](https://www.deel.com/blog/deel-immigration-open-to-individuals/) ·
  [Deel Visa Eligibility Checker](https://www.deel.com/blog/best-tools-to-check-employee-visa-eligibility/)
  This is a well-funded, live, individual-facing, human-reviewed mobility product — the exact
  shape of rank 2's moat, already shipped by a company with far more compliance/legal capacity
  than AutoTime has today. **Not yet verified:** exact EU-jurisdiction depth of Deel's checker,
  whether it makes AutoTime-style evidence-linked claims or just a pass/fail eligibility signal,
  and its pricing for the individual-facing product — worth a follow-up pass before treating this
  as fully characterized.
- **Localyze** — Europe-founded global-mobility case-management platform, backed by General
  Catalyst and Y Combinator; **acquired by Boundless Immigration in October 2025**, creating a
  combined US+Europe mobility platform. Strictly B2B (sold to HR/employers), not candidate-facing.
  [Boundless press release](https://www.boundless.com/press/boundless-acquires-european-mobility-leader-localyze-creating-a-unified-solution-to-navigate-global-workforce-challenges) ·
  [Localyze](https://www.localyze.com/)
- **Multiplier, Remote.com** — not independently re-verified this pass (see limitations below);
  treat as unconfirmed rather than assumed absent.

**What this changes:** the original rank-2 rationale ("a well-resourced competitor *could*
replicate this country by country") undersold the actual timeline risk. Deel is not a hypothetical
fast-follower — it is a real, currently-operating, individual-facing mobility product from a
company with materially more capital and compliance headcount than AutoTime. AutoTime's genuine
differentiation against Deel specifically is not "we offer mobility guidance" (Deel already does)
but the combination this document's rank 2 always implied and the capability audit above shows is
still mostly unbuilt: *evidence-linked, source-cited, freshness-tracked* guidance integrated with
*application preparation*, not a standalone eligibility checker. That combination is real and
still undifferentiated by anyone found in this research — but it is the thing to build now, not a
comfortable multi-year lead.

**Limitations of this research pass, stated plainly:** this was five targeted web searches done
directly in one sitting, not the fuller five-parallel-agent pass used for the mobility-pathway
atlas (`docs/reports/` — see the European Tech Mobility Atlas artifact from the same session).
Multiplier, Remote.com, Boundless's own standalone product (pre-Localyze-acquisition), and
smaller/regional EU-specific competitors were not independently verified. Treat this section as a
real, sourced starting point that materially changes the rank-2 timeline risk — not as an
exhaustive competitive landscape.

## Non-goals for this analysis

This document does not revisit or relitigate the investment strategy's scope, phases, or
non-goals — it answers a narrower question (defensibility) using the same three pillars and the
same measurement framework already approved. It should not be read as license to add
moat-motivated scope (e.g. a broader outcome-data product, a public mobility-guidance database)
without going through the existing prioritization rule and its five questions.
