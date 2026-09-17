# Claim-level quality audit

**Audit date:** 12 September 2026  
**Ledger state:** 123 claims: 111 high-confidence and 12 medium-confidence; 56 explicitly record a contradiction, ambiguity, supersession issue or unresolved dependency. No low-confidence claim is accepted into product logic.

## Audit method

Every row is an atomic evidence assertion with a unique ID, bounded jurisdiction/entity/route, claim type, HTTPS source, publisher, source/retrieval/effective dates, confidence, contradiction state, product consequence and safe interim behaviour. The package validator checks required fields, IDs, case dependencies and every source-chain claim reference.

Confidence describes evidence quality, not legal approval or product readiness. High-confidence claims may prove that an official conflict or authority dependency exists. A route becomes releasable only through its complete chain, tests and expert sign-off.

## Medium-confidence inventory

| Claims | Limitation | Closure requirement |
|---|---|---|
| `IE-002` | DETE remuneration table conflicts with controlling S.I. 643/2025 | Monitor correction; retain statutory precedence; obtain expert approval |
| `PT-001`, `PT-002` | Blue Card statistic and Tech Visa interpretation remain incomplete | Capture controlling statistic and expert-approved rounding/application rules |
| `CZ-001` | Older administrative duration wording is stale | Preserve as stale-source fixture; expert-confirm current section 42j treatment |
| `LT-001` | Commission numeric examples are stale | Preserve as stale fixture; use current Lithuanian amount and capture current shortage list |
| `IT-001`, `IT-002` | Exact ISTAT observation and job-specific CCNL mapping are unresolved | Obtain stable statistic plus employer sector, agreement, level and pay table |
| `BE-BR-LAW-001` | Decree text is from an Official Gazette mirror | Capture canonical eJustice publication and consolidation |
| `CMP-004` through `CMP-007` | Capability and scale statements are vendor-published | Use only as observed positioning; obtain independent buyer/user evidence |

This table accounts for all 12 medium-confidence rows. No medium claim silently controls a definitive output.

## Release-blocking conflicts and dependencies

- **France salary:** Service-Public displays EUR 53,836.50 while the current reference order and 1.5 formula derive EUR 59,373. Duration is resolved at six months; exact salary output remains `source_conflict`.
- **Portugal:** the Tech Visa 2.5-IAS calculation produces a half-cent and no route-specific rounding authority has been captured; the Blue Card annual statistic is unresolved.
- **Italy:** approximately EUR 36,300 is not an exact boundary, and the applicable CCNL depends on employer/job classification.
- **Belgium:** Brussels canonical publication and the Flanders successor statistic remain release dependencies; work region must be known.
- **Luxembourg:** EUR 65,652 is current official administrative guidance, but the controlling Grand-Ducal amount instrument and history are not captured.
- **Estonia:** derived amounts require administrative confirmation of series, effective interval and rounding.
- **United Kingdom:** current-rule commencement mapping and a written IAA scope opinion constrain candidate-specific guidance.
- **Switzerland, Austria and other authority-driven branches:** candidate facts cannot establish cantonal, quota, labour-market or agency outcomes.

## Resolved precedence and supersession findings

- **Ireland:** S.I. 643/2025 controls at EUR 40,904/EUR 36,848 from 1 March 2026; S.I. 213/2026 separately changes occupation schedules from 13 May. The inconsistent DETE table is a monitored source defect.
- **France duration:** Article L421-11 changed from one year to six months on 3 May 2025; current Service-Public corroborates it and France-Visas is stale.
- **Czechia:** current section 42j requires six months, not the older one-year administrative wording; announcement 44/2026 supplies the dated amount.
- **Finland:** Act 224/2024 replaced the older one-year/1.5-times formulation with six months and an average-salary floor.
- **Portugal IAS:** Portaria 480-A/2025 sets EUR 537.13 from 1 January 2026 and expressly revokes its predecessor.
- **Lithuania:** the current 2026 BDU and 12/25 May transition are captured independently of stale supranational examples.

## Product enforcement

`conditional` means all deterministic visible predicates may be evaluated while named authority/reviewer dependencies remain. `review_required` means a material dependency is absent or interpretive. `source_conflict` means authoritative current evidence disagrees and the disputed predicate cannot decide. `regulated_review` and `authority_review` prohibit candidate-side deterministic advice.

Every decision must store the exact claim and source versions it used. Corrections add successor records and replay affected decisions; they never rewrite the historical chain.

## Audit limitations

This audit proves internal traceability and explicit uncertainty. It does not prove legal correctness, source-monitoring uptime, expert competence, user comprehension, behavioural improvement or production reliability. Those require the external evidence in the jurisdiction review register and completion audit.
