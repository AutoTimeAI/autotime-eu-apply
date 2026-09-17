# Commercial Validation Operating Plan

## Objective

Measure actual purchase, delivery, repeat use and contribution for the pre-application decision
proposition. Stated willingness-to-pay is discovery evidence only.

## Target participant

A qualified prospect is a non-EU software, data, security, cloud or technical product professional
who intends to apply in Germany or the Netherlands within six months and can provide at least one
real vacancy. Record current work-right position and prior route experience for analysis, but do not
make qualification depend on a predicted visa outcome.

## Offer cells

Run sequentially or randomise within the same acquisition channel where sample volume permits:

| Cell | Deliverable                               | Price hypothesis | Question                                    |
| ---- | ----------------------------------------- | ---------------: | ------------------------------------------- |
| A    | One evidence-linked vacancy decision      |         GBP 9–15 | Will a user pay for the smallest result?    |
| B    | Five-decision pack plus reusable evidence |        GBP 29–59 | Is repeated vacancy comparison valuable?    |
| C    | Monthly evidence workspace                |  GBP 29–49/month | Does recurring use exist?                   |
| D    | Expert-reviewed corridor packet           |       GBP 99–249 | Can review create trust with viable margin? |

Price bands are hypotheses, not recommended final prices. Keep offer, turnaround, refund policy,
human involvement and exclusions explicit.

## Funnel definitions

- `qualified_exposure`: target prospect receives and views the same offer.
- `serious_conversation`: prospect discusses a real vacancy and confirms timing/segment.
- `checkout_start`: Stripe session created by that prospect.
- `paid`: successful non-founder, non-test payment reconciled to Stripe event.
- `delivered`: promised decision pack delivered inside stated scope/time.
- `activated`: at least one decision opened and decisive evidence reviewed.
- `repeat_use`: a distinct vacancy evaluated after initial delivery.
- `repeat_paid`: second independent purchase or successful renewal.
- `refund`: full/partial refund with reason and delivery stage.

Do not change definitions after results without a versioned analysis deviation.

## Minimum first-cohort evidence

Target the protocol funnel of 100 qualified exposures, 30 serious conversations, 10 checkout starts,
5 payments, 3 completed packs and 2 repeat-paid/renewal events. These are decision thresholds for a
small discovery cohort, not statistically generalisable conversion benchmarks.

If channel volume cannot reach the denominator, report the incomplete test rather than extrapolating.

## Fully loaded contribution

```text
net revenue
= gross receipts
- refunds
- indirect taxes collected/borne
- payment fees

delivery contribution
= net revenue
- source-operations labour
- expert labour
- support/complaint labour
- inference/API cost
- transaction-linked storage/email cost
- correction/rework cost
```

Record labour minutes at a declared loaded hourly rate. Show contribution before and after acquisition
cost; early founder labour is not free. Do not treat fixed product development as variable delivery
cost, but disclose it separately for runway decisions.

## Analysis cuts

Report denominators by country, route, job family, experience level, acquisition channel, offer,
price, delivery model and cohort. Minimum outputs:

- checkout and payment conversion;
- activation and repeat-use curves;
- refunds and reasons;
- median/upper-quartile expert, source and support time;
- contribution per pack/decision;
- corrections by severity;
- user action after decision;
- losses to free official research, general LLM, lawyer, incumbent mobility platform or no action.

Avoid pooling Germany and Netherlands when route economics differ.

## Experiment integrity

- Pre-register target segment, offer, price, denominator and stop/continue rule.
- Exclude founder/team/friends, test payments and compensated purchases from demand evidence.
- Record discounts and acquisition effort.
- Do not withhold safety information for conversion experiments.
- Separate a refund guarantee from willingness to pay in interpretation.
- Preserve negative results and abandoned checkouts.
- Reconcile ledger entries to real Stripe events and accounting records.

## Decision rules

Continue the Decision Pack if the minimum paid/repeat signal is reached, users understand limits and
delivery contribution improves with repeated cases. Test subscription only when users naturally
bring multiple vacancies. Test expert review only after authority/scope is documented.

Narrow to a transaction or expert-lead product if users pay once but do not repeat. Pivot toward an
expert evidence workspace if experts gain efficiency while candidates do not pay. Stop automated
decision investment if unsafe errors persist or users obtain equivalent value from official
checklists/general LLMs.

## Operational files

Use `commercial-experiment-ledger.csv` as the row-level ledger. Store consent and identity separately.
Maintain offer-version documents, Stripe event references, delivery artifacts, cost-rate assumptions,
analysis queries and deviations in the evidence room. Never place secrets or full payment details in
the research repository.
