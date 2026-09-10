# AutoTime EU Apply — moat analysis

**Decision date:** 10 September 2026
**Status:** Draft for founder/product review — not yet an approved governing document
**Companion to:** [product-core-investment-strategy.md](product-core-investment-strategy.md)
**Question this document answers:** given the three approved investment pillars, why couldn't a
well-funded competitor ship the same product in a quarter?

The investment strategy decides *what to build and in what order*. It does not decide *why it
would be hard to copy* — that question is not addressed anywhere in its ten pages, and the two
are genuinely different documents. This one exists to close that gap.

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
| 2 | Governed EU mobility-source data (per-country guidance, cited, freshness-tracked, named review owner) | All users of a given country (content moat) | Partially real — the strategy already requires source/jurisdiction/date/owner tracking | **Real but rented.** Genuinely expensive to build *well* and to keep *honest* (stale or wrong guidance is worse than none), and a careless fast-follower who copies it sloppily takes on real reputational and legal risk AutoTime has designed around. But a well-resourced, patient competitor with a compliance hire could replicate this country by country. |
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

## Non-goals for this analysis

This document does not revisit or relitigate the investment strategy's scope, phases, or
non-goals — it answers a narrower question (defensibility) using the same three pillars and the
same measurement framework already approved. It should not be read as license to add
moat-motivated scope (e.g. a broader outcome-data product, a public mobility-guidance database)
without going through the existing prioritization rule and its five questions.
