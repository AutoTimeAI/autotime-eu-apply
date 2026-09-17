# Evidence-to-Product Implementation Roadmap

**Planning horizon:** 24–36 months  
**Rule:** elapsed dates are estimates; evidence gates—not calendar pressure—control release.

## Workstreams

| Workstream               | Outcome                                     | Engineering-controlled                                | External dependency                         |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Policy/source operations | Current, versioned, monitored country rules | Registry, snapshots, diffs, dependency graph, replay  | Interpretation and jurisdiction review      |
| Evidence platform        | Supported candidate/vacancy/employer facts  | Schemas, extraction, spans, conflicts, deletion       | User confirmation and document authenticity |
| Decision science         | Reproducible selective recommendations      | Compiler, trace, calibration, test corpus             | Expert labels and adjudication              |
| Product trust            | Users understand and appropriately rely     | Explanation UX, uncertainty, correction flows         | Moderated target-user studies               |
| Commercial proof         | Repeat paid demand with viable margin       | Checkout, analytics, cost ledger                      | Prospects, payments and retention           |
| Regulatory/privacy       | Permitted outputs and controlled data       | Output policy, DPIA inputs, security, retention tests | Counsel opinions, ICO and expert sign-off   |
| Country expansion        | Independently releasable route packs        | Shared platform and adapters                          | Local sources, reviewers and operations     |

## Phase 0 — research integrity and frozen scope (weeks 0–4)

### Deliverables

- Maintain the source ledger, contradiction register and market readiness matrix.
- Mark legacy narrative reports as Phase 0 where evidence remains incomplete.
- Freeze two primary routes: Netherlands Highly Skilled Migrant and Germany EU Blue Card; model the
  Netherlands EU Blue Card and German §19c IT path only as explicit comparators needed to prevent route
  conflation.
- Define target persona and exact allowed output language.
- Create counsel briefs for UK IAA scope and EU AI Act Annex III point 7/4(a) applicability.
- Recruit target-user and expert-review candidates; do not count recruitment as completed validation.

### Exit gates

- Every frozen-slice rule has an official source and exact evidence requirement.
- No unresolved contradiction affects the slice's core test cases.
- Named owners exist for legal, expert, UAT and source operations.
- Founder accepts prohibited claims: no “more interviews,” guaranteed eligibility or implied legal advice.

## Phase 1 — governed vertical slice (weeks 4–12)

### Engineering

- Verify live-call reachability and wire the existing integrity trace to an operational surface.
- Add source revisions, route-rule bundles and policy-bound append-only decision records.
- Implement IND sponsor snapshot and precision-first employer matching.
- Add stable candidate/vacancy source spans and claim-evidence export blocking.
- Implement historical and policy-delta replay.
- Add correction taxonomy and a live override path.
- Add expert-sign-off schema without fabricating sign-off records.

### Research and evaluation

- Minimum 50 golden/boundary/adversarial cases across both routes.
- Two-person internal review; disagreements remain explicit.
- 8–12 discovery interviews and 12–20 comprehension/reliance participants.

### Exit gates

- Zero false-green and unsupported-claim failures in the release corpus.
- 100% historical replay equality under the stored bundle.
- No fuzzy employer match becomes verified.
- Critical source drift freezes affected decisions.
- Expert sign-off and output authority are current before personalised private-beta use.

## Phase 2 — paid private beta (months 3–6)

- Launch only the DE/NL corridor to consented participants.
- Verify real Stripe checkout/webhooks, Resend delivery and Sentry events/alerts.
- Run paid decision-pack and evidence-workspace tests.
- Measure comprehension, apply/skip/review changes, corrections, repeat use and fully loaded cost.
- Test deletion cascades, retention and disaster recovery in production-like infrastructure.
- Complete ICO/compliance actions applicable to the operating entity.

### Exit gates

- At least three genuine payments and two repeat-use events.
- Trust study thresholds pass; no systematic over-reliance.
- Contribution-margin trajectory is plausible after support/research/expert costs.
- Production operations complete one simulated critical-source incident and rollback.

## Phase 3 — first expansion wave (months 6–12)

Candidate markets: Ireland, France, Sweden and Spain. Each competes independently for investment.

- Ireland: occupation-list and remuneration versioning plus duties-to-code evaluation.
- France: bilingual parallel-route packs and decree-linked threshold changes.
- Sweden: Blue Card versus ordinary work permit route disambiguation.
- Spain: resolve the 2026 salary instrument before candidate calculations.

### Promotion rule

A market advances only with a complete primary-source chain, ≥50 cases, current expert sign-off,
approved output policy, change monitoring, replay, incident runbook and a credible acquisition/economic
case. Failure of one country does not delay or justify another.

## Phase 4 — six-market operating proof (months 12–18)

- Operate no more than six R3/R4 markets until source and review SLOs are sustained for two quarters.
- Analyse errors and economics by route, not aggregate platform average.
- Establish reviewer redundancy and expiry coverage.
- Evaluate whether corrections/outcomes improve extraction, evidence prompts or route decisions.
- Decide whether the moat thesis passes, remains unproven, or should become a narrower expert workflow.

## Phase 5 — selective European scale (months 18–36)

Potential pool: Austria, Denmark, Finland, Belgium, Luxembourg, Portugal, Estonia, Poland, Czechia,
Italy and Lithuania. Norway, Switzerland and the UK remain separate regulatory/route families.

Expansion order is recomputed quarterly using observed demand, source maintainability, expert cost,
decision determinism and contribution margin. “20-country coverage” is never itself an OKR.

## Resourcing model

| Stage     | Minimum accountable roles                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0–1 | Founder/product lead; senior platform/data engineer; mobility research lead; fractional privacy/security; contracted DE/NL experts |
| Phase 2   | Product engineer; source-operations analyst; customer research/operations; finance analytics support                               |
| Phase 3–4 | Dedicated decision/evaluation engineer; reviewer network owner; country research capacity based on release queue                   |
| Phase 5   | Regional research/reviewer pods only where economics justify them                                                                  |

One person may cover multiple early roles, but responsibilities and approvals must remain distinct.
The rule author cannot be the only approver of a critical production bundle.

## Quarterly investment scorecard

| Dimension                      | Weight | Evidence—not opinion                                       |
| ------------------------------ | -----: | ---------------------------------------------------------- |
| Paid repeated candidate demand |     25 | Cohort payments, refunds and repeat decisions              |
| Decision improvement and trust |     20 | Controlled baseline comparison and comprehension study     |
| Source/rule maintainability    |     15 | Change frequency, unresolved time and operations cost      |
| Expert/review scalability      |     10 | Minutes, cost, disagreement and reviewer coverage          |
| Addressable tech corridor      |     10 | Permits, sponsor-addressable openings and reachable intent |
| Product differentiation        |     10 | Win/loss and substitute comparison                         |
| Contribution economics         |     10 | Fully loaded observed margin                               |

Scores rank investment only after mandatory safety gates. A high commercial score cannot override
missing sign-off or a critical unresolved source change.

## Kill and pivot criteria

Pause expansion when two consecutive cohorts show no repeat use, critical false-green errors cannot be
driven to zero, expert delivery makes contribution structurally negative, or users cannot distinguish
recommendations from guarantees. Pivot to a narrower evidence workspace or expert co-pilot if users
value document/provenance continuity but not automated route decisions. Stop country support when
source/reviewer continuity cannot be maintained.

## Immediate next tickets

1. Convert the delivered DE/NL atomic specification into constrained route-rule fixtures, preserving
   its research-only status.
2. Trace current live decision/evidence callers and confirm the synthesis's reachability findings.
3. Implement the additive migration described by MOB-003/004/010; prove rollback before dual-write.
4. Convert the 40 delivered specification cases to executable fixtures, expand to at least 50 with
   expert labels and isolate a blind holdout.
5. Send the delivered expert/counsel packet with exact bundle/source/corpus hashes.
6. Configure real paid-UAT instrumentation only after DPIA and output-scope review.
