# Competitive Scenario Benchmark

## Purpose

Determine whether AutoTime produces a decision-quality or trust advantage over free official sources,
general LLM research and commercial job/mobility tools. Feature checklists cannot establish this.

## Test conditions

For the same consented synthetic candidate and vacancy scenarios, compare:

1. Official national sources without assistance.
2. A concise official-source checklist.
3. A leading general LLM with web grounding and a fixed prompt.
4. Candidate job-search tools where the relevant capability exists.
5. Mobility platforms where an accessible assessment exists and terms permit evaluation.
6. AutoTime evidence-linked decision record.

Commercial products must be accessed lawfully; do not automate around authentication, rate limits or
terms. Record unavailable capabilities as unavailable, not as failures.

## Frozen scenario families

Use at least 12 scenarios sampled from `de-nl-adversarial-benchmark.csv`:

- salary exactly above/below a boundary;
- conditional reduced threshold;
- title/duties occupation mismatch;
- degree comparability unknown;
- distinct German IT experience routes;
- exact KVK versus brand/subsidiary ambiguity;
- recognised sponsor but vacancy refuses sponsorship;
- Dutch HSM versus Blue Card distinction;
- excluded/uncertain compensation;
- stale or conflicting official sources;
- missing material evidence;
- rule change and historical replay.

## Frozen question

Each condition must answer:

> Should this candidate prioritise this vacancy now, investigate a specific missing fact, or skip it?
> Identify the route considered, decisive evidence, uncertainty, official sources and what the result
> cannot establish.

Do not optimise prompts separately per competitor after seeing outcomes. Preserve prompt, model/tool
version, product plan, date, locale, input and complete output.

## Blind scoring rubric

Two reviewers score outputs without provider identity:

| Measure                          | Scale    | Critical failure                                   |
| -------------------------------- | -------- | -------------------------------------------------- |
| Route distinction                | 0–2      | Conflates HSM/Blue Card or distinct German paths   |
| Deterministic criterion accuracy | 0–2      | False positive on a hard condition                 |
| Evidence completeness            | 0–2      | Omits a material unknown while sounding conclusive |
| Source authority/currentness     | 0–2      | Relies on stale/non-authoritative rule as current  |
| Employer-assertion precision     | 0–2      | Converts register match into vacancy willingness   |
| Uncertainty calibration          | 0–2      | Claims eligibility/approval without basis          |
| Action usefulness                | 0–2      | Next step cannot resolve the uncertainty           |
| Inspectability                   | 0–2      | Decisive claim cannot be traced to evidence        |
| Replay/history                   | 0–2      | Original result cannot be reproduced after change  |
| Time and user effort             | observed | Not a critical failure alone                       |

Any critical failure overrides the total. Report provider-level confidence intervals only when sample
size permits; otherwise publish case results and denominators.

## Strategic interpretations

- AutoTime wins only on speed: workflow advantage, not defensible evidence moat.
- AutoTime wins on source traceability but not decisions: evidence workspace opportunity; narrow the
  recommendation claim.
- AutoTime wins on decisions and comprehension but expert cost remains high: expert co-pilot or
  reviewed-service model.
- AutoTime wins and review cost falls with corpus growth: evidence for the compounding moat thesis.
- General LLM/checklist matches AutoTime: stop investing in the automated decision claim.

## Evidence-room record

Store a manifest, inputs, outputs, screenshots/exports where permitted, reviewer labels,
disagreements, adjudication, timing, price paid and deviations. Vendor marketing pages remain a
separate dataset and cannot be scored as product performance.
