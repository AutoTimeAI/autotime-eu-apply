# Evidence-Weighted Market Prioritisation Model

**As-of date:** 10 September 2026  
**Decision status:** portfolio recommendation, not a production-support declaration

## Decision

Build and validate the Germany–Netherlands corridor first; keep every other market behind explicit
evidence gates. This is a sequencing decision, not a claim that either market is legally ready.

## Why there is no single country score

A weighted total can hide a fatal weakness: a large market can score well while its legal boundary,
source chain or error controls are unacceptable. AutoTime should use two layers:

1. **Non-compensating safety gates** decide whether a market may leave research mode.
2. **Opportunity bands** decide where scarce research and distribution effort goes next.

No amount of market size compensates for a failed safety gate.

## Layer 1 — mandatory release gates

| Gate              | Release evidence                                                           | Failure behaviour                     |
| ----------------- | -------------------------------------------------------------------------- | ------------------------------------- |
| Authority         | Controlling national sources, dates and supersession chain captured        | Research-only; no eligibility verdict |
| Rule coverage     | Marketed routes, exceptions, inputs and counterexamples encoded            | Route omitted or output abstains      |
| Verification      | Independent review plus expert sign-off on exact version                   | No “supported market” claim           |
| Employer evidence | Assertion meaning, entity match and observation date explicit              | “Unknown,” never inferred sponsorship |
| Reliability       | Golden cases, boundary tests, replay, change detection and correction pass | Freeze affected rule version          |
| Regulatory scope  | Written decision on advice, privacy and relevant AI rules                  | Information-only or market disabled   |
| Operations        | Owner, refresh SLO, incident path, rollback and recovery drill exist       | No production traffic                 |
| User safety       | Comprehension and harmful-reliance thresholds pass                         | Redesign output before release        |

Release states are `research_only`, `private_evaluation`, `expert_signed`, and
`production_observed`; they are not percentages.

## Layer 2 — opportunity evidence

Evaluate each dimension as **strong**, **moderate**, **weak**, or **unknown**, with a source and date.
Unknown is not zero: it is an instruction to research or test.

| Dimension                 | Strong evidence means                                      | Decision use                      |
| ------------------------- | ---------------------------------------------------------- | --------------------------------- |
| Observed skilled flow     | Current route-level issuance is materially concentrated    | Demand proxy, never TAM           |
| Technology ecosystem      | Large ICT workforce and/or high ICT share                  | Employer and user density proxy   |
| Vacancy observability     | Unique tech jobs can be collected and normalised           | Product input feasibility         |
| Sponsor observability     | Authoritative employer facts can be entity-resolved        | Differentiation potential         |
| Rule tractability         | Rules are sourceable and sufficiently deterministic        | Automation cost and safe coverage |
| Reachability              | Qualified, active non-EU candidates can be reached         | CAC and experiment feasibility    |
| Repeat-decision potential | Users compare multiple real vacancies before a case exists | Retention potential               |
| Operating leverage        | Maintained evidence serves many decisions                  | Gross-margin potential            |

The first five may use desk evidence. Reachability, repeat use and operating leverage require observed
cohorts and remain unknown until measured.

## Current portfolio classification

| Market         | Investment band     | Evidence-backed reason                                                       | Evidence deficit that can change the decision                        |
| -------------- | ------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Germany        | Beachhead           | 56,252 Blue Cards in 2024 (72% of EU total); 2.3m ICT specialists            | Cases, expert sign-off, vacancy/sponsor observations and paid cohort |
| Netherlands    | Beachhead pair      | Recognised-sponsor register creates verification value; major national route | Entity-resolution precision, route cases, sign-off and paid cohort   |
| France         | Next validation     | 1.4m ICT specialists and 2,775 Blue Cards                                    | Bilingual chain, parallel routes and acquisition evidence            |
| Spain          | Next validation     | 1m+ ICT specialists, 1,924 Blue Cards and current 2026 threshold chain       | Occupation reductions, cases, review and conversion                  |
| Ireland        | Next validation     | English-language technology hub and distinct permit system                   | Occupation mapping, route volumes, cases and reachable demand        |
| Sweden         | Next validation     | High ICT intensity and current threshold evidence                            | Ordinary-permit comparison and small-pool economics                  |
| Austria        | Controlled research | Structured shortage/points logic may be testable                             | Complete comparison and point-boundary cases                         |
| Denmark        | Controlled research | Pay Limit, Positive List and Fast-track create signals                       | Lists, certified employers and route economics                       |
| Finland        | Controlled research | Current specialist/Blue Card threshold captured                              | Overlay rules, cases and small-market economics                      |
| Belgium        | Controlled research | Material EU labour market                                                    | Regional fragmentation and current thresholds                        |
| Luxembourg     | Controlled research | Concentrated international labour market                                     | Small pool, underlying law and expert economics                      |
| Portugal       | Controlled research | Multiple relevant talent routes                                              | Stale values, operational uncertainty and national chain             |
| Estonia        | Controlled research | Digitally legible legal corpus and tech relevance                            | Statistical input, clause map and small-pool economics               |
| Poland         | Watch/research      | Second-highest observed EU Blue Card issuance in 2024                        | Current transposition, thresholds and user reach                     |
| Czechia        | Watch/research      | Relevant technology and Blue Card route                                      | Numeric inputs, bilingual validation and vacancy evidence            |
| Italy          | Watch/research      | About 0.9m ICT specialists                                                   | Current threshold, national chain and route usability                |
| Lithuania      | Watch/research      | Formula and experience alternatives identifiable                             | Current wage/list inputs and national chain                          |
| Norway         | Separate model      | Skilled-worker opportunity outside EU Blue Card                              | Job/pay operations and separate legal model                          |
| Switzerland    | Manual-first        | Attractive market but quotas, priority and cantonal judgement                | Cantonal evidence, reviewers and high-touch economics                |
| United Kingdom | Information-only    | Reachable market and official sponsor register                               | Written IAA scope opinion and authorised arrangement                 |

## Promotion rules

- A beachhead label allocates research effort; it does not pass a release gate.
- Promote only when new primary evidence or observed customer data is attached to the decision.
- Demote for unresolved contradictions, unavailable expert capacity, error-limit breaches or
  uneconomic maintenance.
- Reassess quarterly and on material rule, sponsor-data or regulatory change.
- Never claim “Europe coverage” from a country count; report markets by release state and route.

## First validation-cycle evidence

For Germany and the Netherlands, collect:

1. 100 deduplicated target vacancies per market with legal entity and evidence date.
2. At least 50 sponsor/entity matches per market, including ambiguous and negative examples.
3. At least 30 expert-labelled cases per marketed route, weighted toward boundaries and exclusions.
4. Twelve to twenty target-user sessions using real vacancies.
5. A paid cohort with receipts, refunds, repeat decisions, support time and acquisition source.
6. Change/replay drills preserving the old result and explaining the new delta.

Expansion should follow these observations, not another desk-research score.

## Evidence basis

Primary Eurostat evidence is cited in `market-and-commercial-model.md`. Route and employer-source
status is traceable in `source-ledger.csv`, `market-readiness.csv` and `country-dossiers.md`. Unknown
commercial dimensions remain explicitly unvalidated.
