# Unit-economics decision model

## Status and rule

This is a falsifiable planning model, not a forecast. No cell derived from a hypothetical may be presented as market evidence. Replace assumptions with observed cohort values and preserve both versions.

## Per-decision economics

```text
net_revenue_per_decision
  = realised_net_revenue_per_user / completed_decisions_per_user

variable_cost_per_decision
  = model_and_extraction
  + source_fetch_storage
  + allocated_human_review_minutes × loaded_reviewer_rate_per_minute
  + allocated_support
  + expected_refund_dispute_and_correction_cost

decision_contribution
  = net_revenue_per_decision - variable_cost_per_decision

market_contribution
  = decision_contribution × paid_decisions
  - fixed_country_source_monitoring
  - periodic_expert_reapproval
  - allocated_security_and_compliance
```

The relevant scaling question is whether expert minutes and correction cost fall per safe decision as evidence is reused. Gross margin that excludes founder review time is invalid.

## Offer-envelope tests

| Offer | Headline price | Included decisions | Gross revenue ceiling/decision | Primary falsification |
|---|---:|---:|---:|---|
| Vacancy Decision Pack | £19 | 5 | £3.80 before fees/tax | Cannot support frequent human review |
| Evidence Workspace | £29/month | Observe actual | Unknown until usage measured | Heavy users may create negative contribution |
| Human-Reviewed Corridor Pack | £99 | Define before sale | Depends on scope | Review/support time may consume premium |

These figures show constraints, not attractiveness. At £3.80 gross per decision, automation must handle normal cases and human review must be exception-based. The £99 offer must specify review minutes, practitioner qualification, jurisdiction, liability boundary and turnaround before its margin is interpretable.

## Break-even gates

For each paid cohort calculate:

```text
maximum_affordable_review_minutes
  = (net_revenue - all_nonreview_variable_cost - target_contribution)
    / loaded_reviewer_rate_per_minute

break_even_paid_users_per_market
  = (fixed_country_operations + expert_reapproval + allocated_compliance)
    / contribution_per_paid_user

allowable_CAC
  = conservative_12_month_contribution_LTV × acquisition_payback_fraction
```

Do not use revenue LTV for CAC. Use contribution after refunds, support, source operation and expert cost. Report median and 90th-percentile review/support time because difficult cases drive operational risk.

## Minimum experiment ledger

| Variable | Unit | Evidence source | Collection trigger | Stop signal |
|---|---|---|---|---|
| Qualified visitor | candidate | Eligibility-screened analytics | Landing activation | High traffic but low vacancy submission |
| Completed decision | vacancy | Immutable decision record | Result rendered | High abandonment before result |
| Paid conversion | candidate | Stripe settled payment | Checkout completion | Stated WTP without payment |
| Repeat decision | candidate/week | Decision records | New vacancy | One-off use dominates |
| Review minutes | decision | Reviewer workflow timestamps | Sign-off/correction | Median or tail exceeds offer envelope |
| Correction cost | affected decision | Incident/replay records | Material correction | Old decisions cannot be found/replayed |
| Source operations | market/month | Work log and monitoring | Scheduled checks | Fixed market cost exceeds contribution |
| Refund/dispute | payment | Stripe event | Refund/dispute | Trust or scope mismatch |
| Outcome follow-up | application | Consented candidate report | 30/60/90 day follow-up | Missingness makes result uninterpretable |

## Capital allocation rule

Fund a country pack only when its expected paid cohort can cover its incremental source/expert operations at a conservative observed contribution. Keep sunk platform cost separate from marginal country economics, but include allocated security/compliance in company planning. Pause a country after two review cycles without a credible break-even user path; preserve its historical bundle for replay.

## Founder dashboard

Weekly: activated candidates, completed decisions, comprehension, appropriate decision changes, repeat users, settled payments, refund/dispute, sponsor false positives, review minutes and unresolved critical source changes.

Monthly by market: paid-user contribution, source/expert fixed cost, correction rate, stale/quarantined time, replay coverage and break-even users. Never combine markets in a way that lets Germany hide a structurally unprofitable country pack.

