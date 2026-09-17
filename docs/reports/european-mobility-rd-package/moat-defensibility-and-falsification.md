# Moat Defensibility and Falsification

**As-of date:** 10 September 2026  
**Status:** R&D thesis and test programme; no moat is claimed as proven

## Finding

AutoTime cannot defend itself with AI writing, autofill, job tracking, country comparison, or a visa
eligibility checker. Established products already offer these or they are cheap to reproduce. Deel
offers a visa check with specialist fulfilment; Jobbatical offers pre-hiring eligibility checks and
expert-supported cases; Localyze offers immigration pre-checks.[^1][^2][^3]

The credible moat candidate is a **trust and evidence system for pre-application cross-border
decisions**. It becomes defensible only if repeated use creates assets that improve reliability or
economics and cannot be cheaply reconstructed from public pages.

## Five compounding assets

| Asset                     | What accumulates                                              | Why it may become hard to copy                          | Required proof                                       |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| Versioned rule graph      | Rules, dates, snapshots, conflicts and supersession           | A rival must reconstruct historical and current meaning | Change precision, coverage and recovery SLOs         |
| Expert boundary corpus    | Hard cases, abstentions, rationale and corrections            | Quality labels need scarce jurisdiction expertise       | Reviewer agreement and falling critical errors       |
| Employer evidence graph   | Entities, sponsor assertions, vacancies and ambiguity history | Noisy job data becomes linked to authoritative entities | Precision benchmark and near-zero false verification |
| Candidate evidence ledger | Approved facts, source spans, allowed claims and reuse        | Reuse reduces work without inventing claims             | Lower correction burden and higher repeat use        |
| Decision/outcome dataset  | Decisions, rule deltas, actions, corrections and outcomes     | Longitudinal data connects reasons to behaviour         | Consent, bias controls and demonstrated improvement  |

A pile of prompts, scraped pages or unlabelled outcomes is liability, not a moat.

## Compounding loop

```text
more qualified decisions
  -> more boundary cases and employer observations
  -> better rules, abstention and evidence prompts
  -> fewer critical errors and faster expert review
  -> higher trust, repeat use and contribution margin
  -> more qualified decisions
```

The loop breaks if users do not return, corrections are unstructured, outcomes are too biased, or
expert costs do not decline.

## Threat model

| Threat                                            | Likelihood | Impact      | Response                                                          | Kill signal                                     |
| ------------------------------------------------- | ---------- | ----------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| Mobility incumbents expose candidate-first checks | High       | High        | Win on vacancy comparison, inspectability and candidate ownership | Users prefer incumbent at equal price           |
| Job suites add visa badges or LLM explanations    | High       | Medium–high | Prove entity/version history, replay and abstention               | Users treat provenance as irrelevant            |
| General LLMs improve grounded browsing            | High       | High        | Persist evidence, historical rules and reviewer accountability    | No measured decision-quality advantage          |
| Official portals improve route finders            | Medium     | Medium      | Add cross-market synthesis and reusable evidence                  | Official flow equals comprehension and effort   |
| Expert firms productise cheap assessments         | High       | High        | Reviewer tooling, early-decision distribution and partnerships    | Expert unit cost sustainably undercuts AutoTime |
| Source access changes                             | Medium     | High        | Licensed/API sources, lawful snapshots and manual queues          | Sources cannot be maintained lawfully/reliably  |
| Regulation restricts recommendations              | Medium     | Existential | Conservative taxonomy, authorised partners and controls           | Advice boundary makes economics impossible      |

## Copy-resistance test

A capability is not a moat unless all answers are yes:

1. Does each qualified decision create a reusable, permissioned asset?
2. Does it measurably improve accuracy, trust, speed, retention or delivery cost?
3. Is that improvement reproducible in a benchmark?
4. Would a new entrant need meaningful time, labels, relationships or history to reproduce it?
5. Can AutoTime lawfully retain and use it for the disclosed purpose?

Features failing this test belong only when they improve acquisition or workflow economics.

## R&D workstreams

### A — Decision reliability

- Encode Germany and Netherlands rule packs with dated fixtures and adversarial boundaries.
- Build a blind expert-labelled benchmark; isolate its holdout from development.
- Measure critical false passes, false certainty, source support, abstention and replay.

### B — Trust and comprehension

- Compare verdict-only, official-link checklist, and evidence-linked decision record.
- Ask users to explain decisive facts, uncertainty and next action unaided.
- Insert stale, conflicting and incomplete inputs to test over-reliance.
- Measure correct action, not whether the interface merely “looks trustworthy.”

### C — Employer verification

- Label aliases, subsidiaries, recruiters, groups, duplicates, expired status and no-match examples.
- Optimise for precision; ambiguity must remain unverified.
- Track evidence age and assertion meaning separately from identity.

### D — Economic defensibility

- Sell the decision pack before broad workflow expansion.
- Measure repeat decisions, second payment, expert minutes and correction cost.
- Compare software-only, expert-reviewed and official-links-only delivery.

### E — Competitor response

- Quarterly capture buyer, workflow stage, evidence visibility, expert layer, coverage and pricing.
- Run identical scenarios through available products where terms permit; preserve dated outputs.
- Separate marketing claims from independently observed behaviour.
- Choose deliberately among ignore, match, integrate, partner and differentiate.

## Falsification gates

Narrow or stop the thesis if any persist after the defined study:

- Evidence links do not improve correct apply/skip/review decisions over official links.
- Users cannot explain recommendations or over-trust deliberately flawed outputs.
- The pre-registered paid threshold does not buy, repeat and use multiple decisions.
- False-positive sponsor verification cannot approach zero without excessive manual work.
- Expert review time does not decline as the corpus grows.
- Source maintenance per market destroys contribution margin.
- Users value only resume/autofill functions and will not pay for decision reliability.
- Candidate-specific output cannot be offered lawfully within workable economics.
- Incumbents reproduce the demonstrated benefit before AutoTime establishes retention.

Passing these gates earns the next investment tranche; it does not prove permanent defensibility.

## 90-day evidence target

Produce two replayable rule packs, an expert holdout/error report, an employer-resolution benchmark,
raw comprehension sessions, paid/repeat cohort data, observed delivery costs, and a dated competitor
comparison using identical scenarios. Until then, call this a **moat hypothesis**, not “the moat.”

## Sources

[^1]: Deel, [Employee Mobility Software & Solutions](https://www.deel.com/solutions/mobility/), accessed 10 September 2026. Scope and scale are vendor claims.

[^2]: Jobbatical, [Global Immigration Management Platform](https://www.jobbatical.com/platform) and [pricing](https://www.jobbatical.com/pricing), accessed 10 September 2026. Scope, case counts and performance are vendor claims.

[^3]: Localyze, [Service availability and pre-checks](https://www.localyze.com/service-availability), accessed 10 September 2026. Scope is a vendor claim.
