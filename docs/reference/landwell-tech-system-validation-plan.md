# LandWell: Earn the Tech-Career-System Claim

**Status:** Execution plan, not a claim of completed validation  
**Owner:** Founder  
**Prepared:** 16 September 2026  
**Product brand:** LandWell  
**Domain:** Undecided; this programme must not depend on a domain choice

## 1. Decision this plan addresses

LandWell has a cross-border application decision foundation and some
tech-oriented code and content. That is **not yet evidence that it works as a
specialist decision system for technology professionals**. The first task is to
test one coherent tech use case against real candidate and vacancy evidence,
identify where the system fails, and build only the specialist depth that those
failures justify.

This plan answers four questions:

1. Which tech candidate and role family has a painful, repeated decision
   problem that LandWell can address?
2. Does the current system make accurate, appropriately cautious decisions for
   that slice, including when it must abstain?
3. Do target users understand, trust and act on the reasoning?
4. Does solving this problem create willingness to pay and a plausible path to
   repeatable distribution?

Do **not** market the product as `built for tech professionals`, `trusted`, or
`improving interview outcomes` merely because this plan exists or its automated
tests pass.

## 2. Baseline: what exists and what it does not prove

Repository evidence to inspect before execution:

- `packages/shared/src/international/assessment.ts` provides a country-aware
  Apply/Investigate/Skip engine and safe Explorer fallback.
- `packages/shared/src/international/country-packs/` contains dedicated UK,
  Ireland, Germany and Netherlands packs.
- `packages/shared/src/role-pathways.ts` includes an ESCO technology subset,
  role scoring and market-evidence structures.
- `packages/shared/src/occupations/tech-fintech.ts` contains selected
  occupation data.
- `scripts/decision-quality-evaluation.test.mjs` contains 32 automated cases,
  prominently using constructed Dublin technical-business-analyst examples.
- `docs/reference/founder-first-realtime-testing-guide.md` covers founder
  testing and five real-job records, but is not a representative specialist
  validation study.
- `docs/reference/product-readiness-policy.md` describes per-capability input
  gates, not external decision accuracy.

These establish engineering capability and guardrails. They do **not** establish
representative performance on live software/data/cloud vacancies, sufficient
occupation-specific reasoning, calibrated uncertainty, comprehension by target
users, improved behaviour or paid demand. Verify the live code and tests again
before execution; this inventory is a dated snapshot, not a substitute for a
current audit.

## 3. Choose the first slice from evidence, not preference

Do not start with `all tech`. Treat each role family and candidate circumstance
as a distinct hypothesis.

Possible role-family candidates include software engineering, data
engineering/analytics, cloud/platform engineering, cybersecurity, and
technical business analysis. The founder may have first-hand experience in one
of these, but founder familiarity alone is not proof of market demand.

Interview at least 8-12 reachable target candidates before choosing. Also
review actual vacancy volume and recurring decision obstacles. Score each
candidate slice from 1-5 on:

| Criterion | What to find out |
|---|---|
| Pain frequency | How often do candidates face uncertain apply/skip decisions? |
| Stakes | How much time, money or opportunity is lost from a wrong choice? |
| Founder access | Can the founder recruit pilot users and observe their decisions? |
| Evidence availability | Are vacancy, candidate and official-source facts obtainable? |
| Decision tractability | Can the system help without pretending to determine visa or hiring outcomes? |
| Differentiation | Does this use case expose value beyond a generic chatbot or CV tool? |
| Willingness to pay | Will users commit money, not just praise the idea? |
| Maintenance cost | Can role and country evidence be kept current by a small team? |

Select exactly **one primary slice** for the first validation cycle. Write a
one-page hypothesis in this form:

> For **[candidate situation]** evaluating **[role family]** vacancies in
> **[one hiring-country corridor]**, LandWell helps them decide **[specific
> action]** by using **[specific evidence]**, reducing **[observable wasted
> effort or uncertainty]**.

For example, a sponsorship-required data engineer considering Irish roles is a
testable slice. It is **not** the prescribed slice; choose it only if interviews
and evidence favour it.

Start with one country corridor if possible. Four existing country packs do
not require four-country pilot coverage. Other markets can remain available in
the existing product, but they are outside this specialist claim test.

## 4. Define the decision being evaluated

The unit of analysis is one **candidate × vacancy × employing entity × hiring
country × observation time**. Keep these separate. A candidate may fit the
skills but lack verified work authorisation; a registered sponsor may still
not sponsor that vacancy; a role may have insufficient evidence to decide.

Evaluate at least these dimensions:

1. Role and seniority fit against evidenced experience.
2. Essential versus optional technical requirements.
3. Evidence strength, recency, provenance and missing proof.
4. Vacancy authenticity, location and employing-entity ambiguity.
5. Sponsorship/work-right language and conflicting signals.
6. Country-specific pathway uncertainty and source freshness.
7. Salary/contract facts where they genuinely affect the decision.
8. Candidate constraints: timing, language, remote/hybrid and relocation.
9. Decision explanation: what is known, inferred, missing or blocked.
10. Next action that a candidate can realistically take.

Do not use a single opaque fit score as the ground truth. Preserve the
distinction between `Apply`, `Improve`, `Investigate` and `Skip`, and permit an
explicit abstention when critical facts are missing or contradictory.

## 5. Build a real-world evaluation set

### 5.1 Sampling

Collect an initial **30-50 real, dated vacancies** in the chosen role-family
and corridor, spanning different employers, ATSs, seniority levels and
evidence quality. A small sample can find dangerous failures; it cannot prove
population-wide accuracy.

Include deliberately difficult cases:

- sponsorship explicit yes, explicit no, silent and contradictory;
- salary present, absent, range, wrong currency/period and below/near threshold;
- recruiter listing versus identified employing entity;
- remote-Europe wording without a legal employing country;
- title/duties mismatch, adjacent role and inflated seniority;
- essential technical skill absent despite keyword overlap;
- outdated, closed, duplicated or low-quality postings;
- employer register match, near-match and no match;
- candidate evidence confirmed, self-reported, stale and conflicting;
- actual in-country work rights versus sponsorship required;
- vacancies where the correct outcome is `Investigate`, not a forced verdict.

For each case, store source URL, capture date, vacancy snapshot/hash, candidate
facts used, coverage state, system output, evidence references and output
version. Avoid copying sensitive candidate data into public repository files.
Use synthetic profiles where a real profile is unnecessary; obtain explicit
consent and apply retention limits for real participant data.

### 5.2 Independent reference judgments

At least two independent reviewers should label each case without seeing the
system output first: one domain/role reviewer and one mobility or employment
specialist where the decision depends on that expertise. Reviewers label
action, critical blockers, missing facts, confidence and rationale. Record
disagreements rather than forcing artificial consensus.

If qualified mobility review is unavailable, do not label legal/pathway
correctness as `passed`. Restrict the evaluation to appropriately cautious
signal detection and escalation.

The reference judgment is not a hiring-outcome oracle. It is a documented
human comparison with its own uncertainty and reviewer qualifications.

### 5.3 Freeze a blind holdout

Split cases into a development set and a holdout before changing rules. Do not
rewrite expected labels after seeing outputs without recording the rationale.
Version the corpus and record provenance. Keep an additional live drift sample
because vacancies and mobility sources change.

## 6. Run the end-to-end product test

For each case, use the actual user path where possible:

1. Create or load the candidate evidence profile.
2. Import or paste the vacancy exactly as the user would.
3. Confirm or correct extracted country, employer, role and requirements.
4. Run role fit and mobility assessment.
5. Inspect the final decision and its evidence trail.
6. Try to prepare application content; verify unsupported claims remain blocked.
7. Save the decision and reproduce it from its recorded inputs/version.
8. Submit a correction or disagreement and inspect its handling.
9. Record the candidate's next action and later outcome when available.

Test a deliberate negative and missing-data path in the actual UI, not only
pure functions. Log route, screen, latency, errors, confusing copy, failure to
recover, and any difference between the UI decision and the persisted record.

## 7. Failure taxonomy and repair order

Every discovered issue receives an ID, case reference, severity and owner.

| Class | Example | First response |
|---|---|---|
| Critical false certainty | `Apply` despite explicit sponsorship refusal for a candidate who needs sponsorship | Fail closed; block claim; add regression |
| Wrong jurisdiction/entity | Dutch role assessed with Irish rules or recruiter mistaken for sponsor | Correct identity resolution; abstain while ambiguous |
| Unsupported legal conclusion | Salary/pathway asserted without current official evidence or review | Remove definitive wording; require governance |
| Role-domain failure | Missing essential platform skill treated as a cosmetic gap | Improve role-specific ontology/evidence logic |
| Provenance failure | Recommendation has no inspectable input/source/version | Repair evidence link and record |
| UX comprehension failure | User mistakes `Investigate` for `Apply` | Rewrite and retest with user |
| Workflow failure | Candidate cannot correct extraction or save the decision | Fix blocking journey defect |
| Low-value output | Correct but obvious advice a user would not pay for | Reconsider the value proposition before building more |

Repair in order: safety and false certainty; identity/provenance; specialist
decision quality; comprehension; workflow friction; polish. A feature request
is not automatically a repair. Require case evidence and a predicted effect.

## 8. Specialist depth to build only if failures justify it

The first cycle may identify needs such as:

- versioned role-family taxonomy and occupation mappings;
- essential technical skill and seniority checks grounded in real job duties;
- evidence quality rules for production work, portfolio, certification and
  self-report;
- candidate-specific constraints and hard-blocker precedence;
- employer/entity resolution and vacancy authenticity;
- country/pathway rules tied to current official evidence and expert review;
- clear abstention and verification prompts;
- evaluation datasets covering adversarial and near-boundary cases;
- explanation quality and decision replay improvements.

Do not implement all of these speculatively. Write each engineering change as:

> Observed failure → affected cases/users → root cause → smallest correction →
> regression test → holdout impact → residual limitation.

Prevent overfitting to the development set. Any rule change must be checked
against other supported countries, candidate categories and old decisions.

## 9. Founder-led user and commercial pilot

Recruit **3-5 participants in the selected slice**, in addition to the
pre-selection interviews. Observe at least one real job decision per user.
The founder may participate as the first user, but record founder and external
results separately.

Before showing LandWell's answer, ask the user what they would do and why.
After showing it, ask them to explain the recommendation in their own words,
identify the evidence and uncertainty, and state whether their action changed.
Observe whether they can complete the next step without coaching.

Record:

- baseline intent and post-decision action;
- correct understanding of decision and limitations;
- evidence/source inspection and perceived credibility;
- disagreements and missing context;
- time spent on the decision;
- applications pursued, deferred or avoided;
- application quality changes;
- return use;
- payment commitment, actual payment or a credible purchase attempt;
- later responses/interviews/offers as longer-lag exploratory outcomes.

Do not infer that LandWell caused an interview from a tiny uncontrolled pilot.
Outcome tracking is valuable, but causal claims need larger, better-designed
studies.

## 10. Provisional gates for an earned claim

Set final thresholds before examining the results. These provisional gates are
deliberately stringent and should not be retrofitted to pass.

### Safety and specialist-quality gate

- **Zero critical false-certainty errors** in the reviewed evaluation set and
  pilot; any such error pauses the claim and triggers root-cause review.
- Every country-specific legal assertion used in the slice has current source
  provenance and required expert approval, or is downgraded to investigation.
- At least 90% agreement with the adjudicated reference **on answerable
  cases**, reported with sample size and confidence limitations.
- Unknown/contradictory cases retain an appropriate abstain/investigate state;
  report false certainty separately from overall agreement.
- Decision record, evidence links and replay are intact for sampled cases.

### User-value gate

- At least 4 of 5 pilot users, if five are recruited, can accurately explain
  the decision and its main limitation without prompting.
- At least 3 of 5 report a concrete, observed change to a real application
  decision or preparation step; record what changed, not only satisfaction.
- No unresolved severe trust or comprehension objection.
- At least two independent non-founder users make a real payment or an
  explicitly priced purchase commitment. Praise and free signup do not count.

With fewer than five users, report counts plainly rather than percentages and
classify the result as inconclusive unless the evidence is unusually strong.
These gates justify a **narrow claim for the tested slice**, not a claim for
all tech roles, all countries, or superior hiring outcomes.

### Claim ladder

| Evidence level | Permitted description |
|---|---|
| Today | `Cross-border application decision support with tech-oriented examples` |
| Pilot under way | `Testing evidence-backed decisions with [specific role family] candidates in [country corridor]` |
| Gates passed | `Validated for the tested [role family/corridor] use case, with stated limitations` |
| Multiple role families and corridors replicated | `Built for cross-border technology careers` may become supportable |
| Comparative outcome study | Outcome-improvement claims only to the extent actually measured |

## 11. Stop, pivot and expansion rules

Stop broad tech marketing if critical false certainty recurs, expert review is
unavailable for material mobility claims, or users repeatedly misunderstand the
decision. Fix or narrow the product before extending it.

Pivot the slice if users clearly experience the problem but the chosen role
family is not tractable or worth paying for. Pivot the proposition if the
system is accurate but users do not change behaviour or pay.

Only expand to a second tech role family or country corridor after the first
slice passes safety, user-value and commercial gates. Re-run the same protocol
on the new slice. Do not treat country Explorer availability as specialist
validation.

## 12. Deliverables

1. Slice-selection memo with interview evidence and scoring.
2. Candidate/role/country hypothesis and excluded populations.
3. Versioned real-vacancy case catalogue with privacy-safe provenance.
4. Blind reviewer labels, qualifications, disagreement log and adjudication.
5. Baseline output report: confusion matrix, false certainty, abstention,
   coverage, explanation defects and case-level errors.
6. Root-cause/fix ledger linking every engineering change to observed failure.
7. Updated automated regression and untouched holdout evaluation.
8. Founder-led pilot notes, comprehension results, behaviour changes and
   priced payment evidence.
9. Governance sign-off or explicit limitation for legal/mobility assertions.
10. Dated GO/HOLD/NO-GO claim decision with permitted public wording.

Keep sensitive participant records in an access-controlled location, not in a
public repository. Store only anonymised summaries and test fixtures here.

## 13. Sequencing and realistic time boxes

These are planning estimates, not a promise of elapsed time or outcome:

| Phase | Typical effort | Exit condition |
|---|---|---|
| Slice discovery | 1-2 weeks | 8-12 interviews and one written hypothesis |
| Case set and independent review | 1-3 weeks | 30-50 versioned cases and documented reference judgments |
| Baseline end-to-end evaluation | 3-5 days | Case-level failure report |
| Targeted repairs and holdout | 1-3 weeks | Safety issues closed and measured improvement |
| 3-5-user priced pilot | 2-4 weeks | Observed decisions, comprehension and payment evidence |
| Outcome follow-up | 1-3 months or more | Longer-lag responses/interviews tracked without overclaiming |

Some activities can overlap, but expert availability and real job-search
outcomes cannot be compressed by more coding. The first narrow claim might be
earned in weeks; broad tech-system credibility requires replication and time.

## 14. Claude Code Plan Mode handoff

> Read `docs/reference/landwell-tech-system-validation-plan.md` and
> `docs/reference/landwell-product-brand-decision.md`. Work in Plan Mode only.
> Do not edit code, rename the product, change domains, commit, push or deploy.
> Audit the current repository against Sections 2-10. Produce (1) an exact
> map of all live decision paths and tech-specific data; (2) a gap analysis
> between existing synthetic tests and the proposed real-vacancy evaluation;
> (3) a minimal implementation plan for instrumentation, case capture,
> reference labels, safety gates and regression/holdout evaluation; (4) exact
> files and tests likely affected; (5) privacy and expert-review dependencies;
> and (6) assumptions that require founder validation. Do not claim the tech
> segment is validated merely because tech fixtures or role catalogues exist.

## 15. Definition of done

This plan is accomplished for the **first slice** only when the deliverables
exist, safety and user-value gates are evaluated honestly, the founder records
a GO/HOLD/NO-GO decision, and public wording matches the evidence actually
earned. A completed code backlog without real users and reviewer evidence is
not completion.
