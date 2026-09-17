# AutoTime Core-Moat R&D Strategy

## Executive conclusion

AutoTime should deepen research and development around a **cross-border decision and evidence
system**, not broaden into another general job-search suite. Autofill, tracking, keyword matching,
resume tailoring and interview practice are already offered together by established competitors,
often with meaningful free access.^1 ^2 The defensible opportunity is the joined system that those
features usually do not create:

`candidate evidence → country-aware viability decision → supported claims → reviewed application → outcome`

The moat will not come from a single algorithm. It can emerge from five assets that compound:

1. a versioned candidate evidence graph;
2. governed country and mobility knowledge;
3. an explainable decision policy with calibrated uncertainty;
4. a claim-to-evidence application compiler; and
5. longitudinal correction, action and outcome data.

The first four make the product trustworthy. The fifth can make it increasingly difficult to
replicate. Until meaningful repeat-use and outcome data exist, this remains a moat hypothesis—not
a moat claim.

## Competitive boundary

Simplify markets autofill across more than 100 job boards and portals, with autofill, tracking,
matching and a basic resume builder kept free.^1 Its tailoring workflow also provides resume and
keyword scoring.^3 Teal combines a tracker and AI resume builder, and its current paid comparison
includes keyword matching and interview practice.^2 Competing on the number of supported sites,
generated documents or generic workflow breadth therefore puts AutoTime against products with
larger distribution and mature commodity features.

European public infrastructure also sets a boundary. EURES reports a database of roughly three
million vacancies and offers cross-border information and adviser support.^4 ESCO provides a
versioned, multilingual linked-data classification with stable concept identifiers and APIs for
job matching, skills intelligence and career guidance.^5 AutoTime should use these systems as
trusted infrastructure rather than attempt to recreate their breadth.

The differentiated question is narrower and more valuable:

> Given this candidate’s evidence, this vacancy, this employing country and the current governed
> sources, is the role worth pursuing—and what can the candidate truthfully submit next?

## Moat architecture

### 1. Candidate evidence graph

Represent every material fact as a stable object rather than prose embedded in a profile:

- fact identifier and semantic type;
- value and normalized value;
- source identifier and source excerpt location;
- status: verified, user-declared, inferred, conflicting, stale, missing or unknown;
- effective and expiry dates where relevant;
- confidence and verification method;
- corrections, supersession and approval history;
- sensitivity and risk classification;
- links to claims, decisions and outcomes that used the fact.

This graph becomes a personal switching cost only if it saves repeated work and retains trustworthy
history. It should support import and export; lock-in through data obstruction would weaken trust.
The defensibility comes from accumulated structured corrections and usage, not trapping the user.

### 2. Governed mobility knowledge graph

Treat each mobility conclusion as a compiled result from versioned source material:

- jurisdiction, pathway and candidate circumstance;
- official source URL, publisher and relevant section;
- retrieved, reviewed and next-review dates;
- rule version and change history;
- scenario inclusions, exclusions and unresolved ambiguity;
- named reviewer and required qualification;
- tests affected by a source change;
- incident and correction history.

EURES explicitly describes cross-border decisions as involving practical, legal and administrative
questions and points users to adviser support.^6 That supports AutoTime’s role as a transparent
triage and verification layer, not a substitute for legal advice.

### 3. Explainable decision compiler

Replace loosely connected scores with a deterministic decision envelope:

```text
decision: Apply | Investigate | Improve | Skip
decisive_reason
hard_blockers[]: fact + evidence status + rule + source
soft_gaps[]
unknowns[]
positive_evidence[]
next_action
confidence
policy_version + source_versions
```

The numerical fit score remains supporting information. A hard eligibility constraint must never
be averaged away. Every decision must be reproducible from a snapshot of evidence and policy,
and a later policy change must not silently rewrite the historical record.

Explanations should be evaluated rather than assumed beneficial. Research on human-centered XAI
finds that user evaluation is still sparse and should measure understanding, trust, usability and
human–AI performance.^7 Other experimental work has found no conclusive general benefit from an
explanation alone.^8 AutoTime should therefore test whether candidates can correctly restate the
decision and act appropriately—not optimize explanation length or perceived sophistication.

### 4. Claim-to-evidence application compiler

Generated output should be an auditable compilation target:

`vacancy requirement → candidate facts → proposed claim → transformation → review status → artifact location`

Each material sentence should retain claim IDs and evidence links outside the rendered document.
The compiler should:

- reject unsupported material claims;
- require confirmation for inferred evidence;
- surface conflicts before generation;
- highlight changed or high-risk language;
- record why material evidence was included or excluded;
- retain intentionally blank fields;
- preserve the user-approved final version;
- verify that export/autofill uses the approved version;
- prohibit generated text from changing evidence status.

This is more defensible than prompt engineering because it creates structured, testable behavior
around any underlying model. Providers can be replaced without discarding the evidence system.

### 5. Outcome-calibration layer

Capture privacy-minimal events linked by role, decision, application and cohort identifiers:

- decision shown, understood, accepted, corrected or overridden;
- decisive blocker and evidence state—not raw evidence text;
- kit started, approved, abandoned and marked applied;
- interview, rejection, offer and no-response outcome;
- platform/country/policy versions;
- elapsed time and operational cost;
- user-reported usefulness and reason for disagreement.

Do not train a hiring-probability model initially. First calibrate policy: which blockers are often
corrected, which unknowns stop progress, which explanations produce correct comprehension, and
which decisions lead to deliberate action. Outcome correlation must not be presented as causation.

## R&D workstreams

| Workstream | Research question | Build | Evaluation | Moat contribution |
| --- | --- | --- | --- | --- |
| Decision consistency | Do identical facts always yield the same decision across web, extension and kit generation? | Canonical decision envelope and replay harness | 100% cross-surface parity on governed scenarios | Trustworthy policy IP |
| Evidence provenance | Can every material generated claim be traced and corrected? | Versioned evidence/claim graph | Zero unsupported claims; trace found in under 10 seconds | Personal accumulated asset |
| Mobility governance | Can source changes be detected and safely propagated? | Source registry, expiry, diffs and scenario dependency map | 100% marketed conclusions current or visibly downgraded | Operational knowledge moat |
| Explanation quality | Can users correctly explain the decision and next action? | Two or three explanation variants | ≥80% unaided comprehension; no rise in unsafe overrides | Tested decision UX |
| Override learning | Why do users disagree, and are they right? | Structured correction/override reasons | Review false blockers and missed blockers weekly | Proprietary correction set |
| Application integrity | Does generation preserve meaning while improving relevance? | Claim compiler and artifact manifest | Expert blind review; zero factual expansion | Model-independent safety layer |
| Outcome calibration | Which policies produce useful actions? | Cohort event model and decision replay | Repeat use, approved-kit conversion, decision calibration | Longitudinal dataset |
| Platform reliability | Does the approved artifact survive ATS handoff? | Redirect-aware test corpus | Completion and correction rates by actual ATS | Workflow evidence, not logo count |

## Competitive capability map

The comparison below distinguishes marketed product capability from AutoTime's recommended R&D
position. It does not assume competitor claims are independently validated.

| Capability | Simplify | Teal | Careerflow | Huntr | Jobscan | AutoTime moat position |
| --- | --- | --- | --- | --- | --- | --- |
| Application autofill | Core strength; broad portal coverage | Extension/workflow support | Marketed across 75+ portals | One-click autofill | Not the primary wedge | Maintain reliable reviewed fill; do not compete on count |
| Resume tailoring | AI tailoring and scoring | Core resume/keyword workflow | Optimizer, scoring and generation | Core AI tailoring | Core ATS/match optimization | Compile only evidence-supported changes |
| Tracker | Integrated | Core | Integrated | Core | Supporting | Keep as role history, not generic kanban |
| Interview tools | Supporting/paid capability | Practice included in paid comparison | Voice/video mock interviews | Preparation features | Limited adjacency | Keep typed evidence reuse; avoid breadth |
| Cross-border viability | No clear primary positioning found | No clear primary positioning found | No clear primary positioning found | No clear primary positioning found | ATS-oriented | Lead with candidate-specific country/work-right viability |
| Governed mobility sources | No clear primary positioning found | No clear primary positioning found | No clear primary positioning found | No clear primary positioning found | Not the product | Build versioned sources, expiry and expert review |
| Claim provenance | Profile/resume reuse, not a marketed claim ledger | Not a marketed core differentiator | Accuracy claimed, provenance unclear | Pulls relevant base content | Keyword/match reporting | Make every material sentence traceable |
| Decision-to-outcome replay | Tracker continuity, methodology unclear | Tracking exists | Tracking exists | Metrics and tracking | Match reports | Persist evidence/policy versions and learn from corrections/outcomes |

Careerflow currently markets a particularly broad suite—resume creation and optimization,
tracking, networking, autofill, browser extension and voice/video mock interviews.^11 Huntr similarly
combines tracking, resume tailoring, cover letters, autofill, contacts and interview tracking.^12
Jobscan’s central promise remains ATS-specific matching and optimization.^13 These positions make
feature-suite breadth a crowded battlefield and reinforce the need for a narrower proprietary
decision layer.

## Research doctrine: optimize appropriate reliance, not maximum trust

“Trust” alone is a dangerous success metric. A candidate who trusts every recommendation is not
necessarily better served; the correct goal is reliance that changes with evidence quality and
scenario risk. Recent human–AI research explicitly distinguishes subjective trust from appropriate
reliance.^14 Confidence displays can affect reliance, but confidence and explanations do not
automatically improve joint decisions.^15 Explanations can even increase reliance without helping
people distinguish correct from incorrect advice.^16

AutoTime R&D should therefore measure four behaviors separately:

1. **Comprehension:** can the candidate accurately restate the recommendation and reason?
2. **Error detection:** does the candidate reject a deliberately incorrect or stale conclusion?
3. **Appropriate acceptance:** does the candidate accept a correct, well-supported conclusion?
4. **Recourse quality:** can the candidate correct the decisive fact and understand the changed
   decision?

Every explanation experiment should include both correct and deliberately flawed cases. A design
that raises acceptance of correct cases but also raises acceptance of incorrect cases fails.

## Proprietary evaluation system

Build a versioned scenario laboratory rather than relying on aggregate unit-test coverage.

### Scenario unit

Each scenario should contain:

- synthetic or consented candidate facts with provenance and status;
- vacancy facts and exact source text;
- candidate position, country corridor and employer/entity assumptions;
- governing source and policy versions;
- expected decision, acceptable alternative and prohibited conclusion;
- decisive blocker/gap and evidence status;
- expert rationale and reviewer identity;
- counterfactual edits that should change the decision;
- fairness tags and known limitations.

### Evaluation layers

| Layer | Purpose | Required measures |
| --- | --- | --- |
| Deterministic policy | Catch rule regression | Exact blocker recall, false-block rate, abstention correctness |
| Extraction | Map messy vacancy/CV text into facts | Per-field precision/recall, contradiction detection, unknown rate |
| Generation | Preserve supported meaning | Unsupported-claim rate, omission rate, evidence-link validity |
| Cross-surface parity | Prevent web/extension/kit disagreement | Decision and decisive-reason agreement |
| Human comprehension | Test usable explanations | Restatement accuracy, error detection, time to next action |
| Cohort outcomes | Test product usefulness | correction, override, approved-kit, return and outcome measures |

Maintain three partitions: development, locked regression, and blinded expert challenge. Never
tune rules directly against the final challenge set. Record every production correction as a
candidate for the corpus, but require de-identification, consent compatibility and review before
reuse.

## High-value technical research bets

### Bet A—counterfactual decision explanations

Show the smallest verified change that would alter the recommendation: for example, “If the
employer confirms sponsorship for this vacancy, the decision changes from Investigate to Apply.”
This is more actionable and verifiable than generic feature-importance prose.

**Research risk:** presenting hypothetical legal facts as likely.  
**Control:** label the counterfactual explicitly and link the fact requiring verification.

### Bet B—decision replay and temporal truth

Recompute a historical role under its original evidence/policy snapshot and optionally compare it
with current rules. This makes source changes, corrections and incidents auditable.

**Research risk:** confusing users with two answers.  
**Control:** preserve the historical decision and clearly label any current-policy comparison.

### Bet C—selective prediction and abstention

Research when the system should refuse a conclusion and request one decisive fact. Measure whether
targeted abstention improves accuracy and reduces user effort compared with broad “insufficient
information” states.

**Research risk:** excessive abstention destroys value.  
**Control:** optimize coverage subject to a hard false-certainty ceiling, not abstention alone.

### Bet D—evidence graph compression

Explore whether repeated candidate evidence can be represented as stable atomic facts plus source
spans, allowing fast reuse without resending entire CVs to a model.

**Research risk:** atomization loses context or nuance.  
**Control:** retain original sources, contextual windows and reversibility.

### Bet E—source-change impact analysis

Map a changed official rule to affected scenarios, decisions and users without exposing candidate
content to researchers. This can turn source maintenance from manual reading into a controlled
incident workflow.

**Research risk:** automated diffs misread legal changes.  
**Control:** automated detection triggers human review; it never publishes a new conclusion.

## Portfolio scoring and funding rule

Score every R&D proposal from 0–5 and calculate:

`priority = (customer value × 0.25) + (defensibility × 0.25) + (safety gain × 0.20) + (learning value × 0.15) + (reach × 0.10) + (cost reduction × 0.05)`

Then apply two gates:

- no proposal enters committed work with defensibility below 3 unless it fixes a critical safety
  or reliability problem;
- no proposal enters committed work without a falsifiable experiment and a named decision date.

| Candidate investment | Expected priority | Decision |
| --- | ---: | --- |
| Claim/evidence graph | Very high | Fund |
| Decision replay and source versions | Very high | Fund |
| Correction/override learning | Very high | Fund |
| Expert mobility scenario console | High | Fund after reviewer model defined |
| More ATS logos | Low | Defer |
| Voice/video scoring | Low and high-risk | Reject for this phase |
| Generic cover-letter variants | Low | Defer |
| Proprietary foundation model | Low near-term return | Reject |

## Twelve-month sequence

## First 90-day research backlog

This backlog is deliberately narrower than the product backlog. Each epic must produce reusable
knowledge or a compounding asset, not merely shipped interface.

| Weeks | Epic | Deliverable | Experiment | Exit/stop condition |
| --- | --- | --- | --- | --- |
| 1–2 | Canonical decision contract | One versioned envelope used by Jobs, kit generation and extension | Replay identical cases through every surface | Stop release on any unexplained decision/blocker mismatch |
| 1–3 | Scenario corpus v1 | 100 reviewed synthetic cases across UK, Ireland, Germany and Netherlands | Mutation tests remove/change decisive facts | ≥95% expected decision; 100% hard-blocker recall on critical set |
| 2–4 | Decision snapshots | Persist evidence, policy and source versions with role ID | Re-run historical snapshot after policy update | Original result reproducible byte-for-byte or with documented migration |
| 3–6 | Evidence graph v1 | Stable fact, source, status, correction and supersession IDs | Import the same CV twice and apply corrections | No duplicated facts; correction reused in a second role |
| 4–7 | Claim manifest | Material sentence → evidence links → artifact position | Red-team generated documents | Zero unsupported material claims in locked corpus |
| 5–8 | Recourse workflow | Correct fact, flag disagreement, preview decision delta | Five moderated candidate sessions | ≥80% can correct the decisive fact without assistance |
| 6–10 | Source operations | Expiry, owner, diff, affected-scenario and sign-off records | Simulated source-rule change drill | Affected decisions located; stale conclusions downgraded before publication |
| 8–12 | Appropriate-reliance study | Correct and deliberately flawed decision variants | 10–20 target users, within-subject where feasible | Users reject flawed advice materially more often without rejecting correct advice |
| 9–13 | Closed-cohort instrumentation | Privacy-minimal role-stage events and cost ledger | Founder-led beta | Complete funnel reconstruction without raw CV/vacancy/generated text |

### Required roles

- **Product/research lead:** owns hypotheses, protocol, recruitment and go/no-go decisions.
- **Decision-engineering owner:** owns policy contracts, replay and evaluation.
- **Evidence-integrity owner:** owns provenance, claim compilation and safety incidents.
- **Mobility research owner:** maintains sources, review cadence and jurisdiction boundaries.
- **Qualified reviewers:** sign off only on scenarios within their documented competence.
- **Privacy/security owner:** approves consent, minimization, retention and research-data access.

One founder may hold several roles, but the sign-off must record which role was exercised. Qualified
jurisdiction review cannot be self-declared as complete merely because engineering tests pass.

### R&D operating cadence

- Weekly: review corrections, overrides, false blockers, missed blockers and unsupported claims.
- Fortnightly: decide whether each experiment continues, changes or stops.
- Monthly: freeze a policy/source version and publish an internal evaluation card.
- Quarterly: run the board-level moat test and reallocate capacity based on evidence.

Every research result should record hypothesis, protocol, sample, exclusions, result, limitations,
decision and follow-up. Negative results are retained; deleting them would cause repeated failed
experiments and biased product judgment.

### Stage A—foundation and replay, weeks 0–8

- Complete one canonical decision envelope across all live surfaces.
- Persist policy, source and evidence versions with every decision.
- Build a scenario corpus covering countries, candidate positions and blocker boundaries.
- Add decision replay: old input plus old version reproduces the old result; current policy shows a
  visible comparison without overwriting history.
- Add stable claim and evidence identifiers to application artifacts.
- Establish data minimization, deletion and export tests for every new record.

**Gate:** no unexplained cross-surface decision differences; every material claim traceable.

### Stage B—human comprehension and expert challenge, weeks 6–16

- Run moderated decision-comprehension tests with 5–10 target candidates per iteration.
- Have qualified jurisdiction reviewers challenge high-risk scenarios.
- Create red-team cases for ambiguous sponsorship wording, conflicting work rights, stale sources,
  salary thresholds, employer/entity ambiguity and prompt-injected vacancy text.
- Record corrections and disagreement reasons as structured labels.

**Gate:** at least 80% of participants correctly state decision, decisive reason and next action;
zero confirmed unsupported material claims.

### Stage C—closed beta learning, months 4–8

- Recruit one narrow Tech/FinTech cohort across two or three well-governed country corridors.
- Measure time to first decision, correction rate, safe override rate, kit approval, marked-applied
  conversion, second-role return and cost per completed loop.
- Review every false blocker, missed blocker and unsupported-claim incident weekly.
- Publish internal model/policy cards per release.

**Gate:** repeat use and trustworthy action meet the strategy targets; no expansion based solely on
feature completion.

### Stage D—defensibility and commercial proof, months 8–12

- Test a simple paid offer tied to assessments or reviewed kits.
- Use accumulated corrections to improve rules and extraction, with held-out evaluation.
- Add a comparable-scenario explanation only when cohort size, privacy and methodology support it.
- Quantify source maintenance, support and AI costs by completed core loop.

**Gate:** users pay, return with another role, and produce sufficient margin to maintain the
governance system.

## Experiments and kill criteria

1. **Decision-first activation test:** compare minimal vacancy/CV/country entry with full profile
   onboarding. Kill mandatory long onboarding if it materially reduces first-decision completion.
2. **Explanation test:** compare decision + reason + next action against a longer score breakdown.
   Keep the version with higher comprehension, not higher “looks impressive” ratings.
3. **Evidence-map test:** measure whether claim links reduce review time and factual corrections.
   Do not build elaborate graph visualization if users cannot use it faster than a concise ledger.
4. **Country-depth test:** compare two deeply governed corridors with broad shallow coverage. Stop
   expansion if source-review cost or correction rate breaches the operating threshold.
5. **Willingness-to-pay test:** charge for the completed outcome users understand. Do not interpret
   stated willingness as demand; require a completed transaction.

## Features to add—and features to resist

### Add

- Decision history and replay with visible policy/source versions.
- Correct-this-fact and disagree-with-this-decision workflows.
- Structured hard blockers with evidence status and official verification links.
- Claim ledger beside every generated artifact.
- High-risk change review and before/after explanations.
- Source expiry, alerts, dependency mapping and automatic downgrade to unknown.
- Application artifact manifest tied to the approved version.
- Privacy-safe cohort and outcome instrumentation.
- Expert scenario review console and release sign-off log.

### Resist

- More generic document types.
- More job-board logos without measured completion reliability.
- Autonomous submission.
- Recruiter scraping.
- Broad career coaching and voice/video scoring.
- Predictive “chance of interview” scores before a valid dataset and methodology exist.
- A proprietary foundation model; the differentiated asset is governed data and policy behavior.

## Intellectual-property and data strategy

Patentability should be assessed with specialist counsel, but patents should not be treated as the
primary defense. The stronger practical protections are:

- proprietary scenario and correction corpora;
- versioned policy and evaluation harnesses;
- reviewer workflows and source-dependency data;
- longitudinal candidate-authorized outcome data;
- trade-secret protection for calibration and incident learnings;
- brand trust earned through transparent limitations and corrections;
- integrations that make the evidence record useful across repeated applications.

Use ESCO identifiers as interoperable semantic anchors rather than proprietary replacements. ESCO
is explicitly designed as linked open data with stable identifiers and backward compatibility.^5
AutoTime’s proprietary value should sit above it: candidate-specific evidence quality, mobility
context, decision policy, corrections and outcomes.

## Governance guardrails

- Never describe mobility output as legal advice or guaranteed eligibility.
- Require named qualified review before marketing a high-risk jurisdiction scenario.
- Separate general guidance from candidate-specific conclusions.
- Preserve historical decisions and the exact versions that produced them.
- Make correction easy and never hide disagreement to improve metrics.
- Keep raw candidate evidence out of analytics.
- Test for differential error patterns across nationality, work-right status, career gaps,
  disability-related needs and non-traditional education.
- Maintain human review at consequential transitions. European AI rules emphasize effective human
  oversight for high-risk systems, while ICO guidance emphasizes meaningful explanations of
  AI-assisted decisions.^9 ^10 AutoTime is candidate-side decision support, not an employer hiring
  system, but adopting these principles is strategically useful for trust and future resilience.

## Investment allocation

For the next two quarters, allocate core product/R&D capacity approximately as follows:

| Area | Share |
| --- | ---: |
| Decision policy, scenario corpus and evaluation | 30% |
| Evidence/claim graph and application integrity | 25% |
| Mobility-source governance and expert review tooling | 20% |
| Cohort instrumentation, experiments and outcome analysis | 15% |
| Core-loop reliability, privacy and recovery | 10% |

Peripheral feature expansion receives zero committed allocation unless it passes the strategy’s
five-question prioritization gate.

## Board-level moat test

Review quarterly:

- Are decisions measurably more consistent and better calibrated?
- Is the governed scenario corpus growing in quality, not only count?
- Are candidates accumulating reusable verified evidence and returning?
- Are corrections producing demonstrable policy improvements?
- Can every material claim be traced and replayed?
- Are source changes detected before users rely on stale guidance?
- Are users paying enough to sustain expert review and source maintenance?

If the answers remain no, the product has useful features but not a moat. If they become yes, a
competitor must reproduce years of governed scenarios, candidate-authorized corrections,
cross-border policy operations and longitudinal outcomes—not merely copy screens or prompts.

## Sources

1. Simplify, “[Autofill Job Applications and Track Jobs | Simplify Copilot](https://simplify.jobs/copilot),” accessed 10 September 2026.
2. Teal, “[Teal vs. Teal+](https://help.tealhq.com/en/articles/9530153-teal-vs-teal),” accessed 10 September 2026.
3. Simplify, “[Auto-Tailoring your Resume with Copilot](https://help.simplify.jobs/articles/0515607-auto-tailoring-your-resume-with-copilot),” accessed 10 September 2026.
4. EURES, “[EURES services](https://eures.europa.eu/eures-services_en),” accessed 10 September 2026.
5. European Commission, ESCO, “[Use ESCO](https://esco.ec.europa.eu/en/use-esco),” accessed 10 September 2026.
6. EURES, “[Living and working](https://eures.europa.eu/living-and-working_en),” accessed 10 September 2026.
7. Rong et al., “[Towards Human-centered Explainable AI: A Survey of User Studies for Model Explanations](https://arxiv.org/abs/2210.11584),” 2022.
8. Alufaisan et al., “[Does Explainable Artificial Intelligence Improve Human Decision-Making?](https://arxiv.org/abs/2006.11194),” 2020.
9. European Union, “[Artificial Intelligence Act—Article 14 human oversight](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CONSIL%3AST_7536_2024_INIT),” 2024.
10. Information Commissioner’s Office and The Alan Turing Institute, “[Project ExplAIn: explaining decisions made with AI](https://ico.org.uk/media/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/explaining-decisions-made-with-artificial-intelligence-1-0.pdf),” accessed 10 September 2026.
11. Careerflow, “[Features](https://www.careerflow.ai/features),” accessed 10 September 2026.
12. Huntr, “[Job Application Tracker, AI Resume Builder, Tailored Resumes and More](https://huntr.co/),” accessed 10 September 2026.
13. Jobscan, “[ATS Resume Checker and Job Search Tools](https://www.jobscan.co/),” accessed 10 September 2026.
14. Raees and Papangelis, “[From Trust to Appropriate Reliance: Measurement Constructs in Human-AI Decision-Making](https://arxiv.org/abs/2604.23896),” 2026.
15. Zhang, Liao and Bellamy, “[Effect of Confidence and Explanation on Accuracy and Trust Calibration in AI-Assisted Decision Making](https://arxiv.org/abs/2001.02114),” 2020.
16. Fok and Weld, “[In Search of Verifiability: Explanations Rarely Enable Complementary Performance in AI-Advised Decision Making](https://onlinelibrary.wiley.com/doi/full/10.1002/aaai.12182),” 2024.
