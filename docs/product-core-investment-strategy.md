# AutoTime EU Apply — core product investment strategy

**Decision date:** 9 September 2026  
**Status:** Approved product direction  
**Applies to:** Product, engineering, design, QA, data, operations, marketing and beta delivery  
**Planning horizon:** Private beta through initial paid validation

## Executive decision

AutoTime EU Apply will concentrate product investment on three connected capabilities:

1. **EU Fit** — determine whether a European role is genuinely viable for the candidate.
2. **Evidence integrity** — ensure every material application claim is supported, reviewable and attributable.
3. **Application preparation** — turn an accepted role decision into a truthful, vacancy-specific application kit.

Together, these capabilities form the product. Vacancy capture, profile management, tracking, billing, administration and observability support this product loop. They are not independent value propositions.

The governing product promise is:

> Give AutoTime a vacancy and the candidate's evidence. AutoTime will explain whether the role is viable, identify what must be verified or improved, and help prepare a truthful application for human review and submission.

The recommended public positioning is:

> **Better applications. Clearer cross-border decisions.**

AutoTime must not claim that it produces more interviews or offers until measured customer outcomes support that statement.

## Product classification and objective

AutoTime is a **product-shaped MVP in controlled private beta**. The browser extension is a supporting tool; the persistent cross-border decision and application workflow is the product.

The immediate objective is not to maximize feature count or application volume. It is to prove that target candidates repeatedly trust and act on AutoTime's role decisions and can prepare higher-integrity applications with less wasted effort.

## Target customer and initial market boundary

The initial customer is an experienced, English-speaking technology or FinTech candidate who:

- is applying across two or more UK/EU markets;
- has credible employment, education or project evidence;
- is uncertain about work authorization, sponsorship, relocation, language expectations or country-specific suitability; and
- values application quality and accuracy over mass submission.

Initial delivery should favor a small, explicitly supported set of countries, candidate circumstances and vacancy platforms. Coverage must be stated by capability and evidence quality, never implied by a single platform or country count.

## The core product loop

```text
Vacancy capture + candidate evidence + target country
                         |
                         v
                 EU Fit decision
                         |
                         v
          Blockers, uncertainty and next action
                         |
                         v
           Evidence-backed application kit
                         |
                         v
                  Human review
                         |
                         v
             User-controlled submission
                         |
                         v
                 Outcome tracking
                         |
                         +----> product learning
```

The first useful outcome is a clear role decision, not completion of a profile or dashboard tour.

## Investment pillar 1: EU Fit

### User outcome

The candidate can decide whether to apply, investigate, improve or skip—and understands why.

### Required product behavior

- Accept a captured, pasted or imported vacancy.
- Use the job description, candidate evidence and target/vacancy country as minimum inputs.
- Evaluate work rights, sponsorship, location, language, qualifications, experience and material role requirements.
- Separate hard blockers from soft gaps and optional improvements.
- Lead with a categorical decision: `Apply`, `Investigate`, `Improve` or `Skip`.
- Present the decisive reason, missing facts and next action before detailed scoring.
- Treat an unresolved legal or eligibility fact as `Unknown — verify`; never invent certainty.
- Attach source type, jurisdiction, retrieval/review date and confidence to mobility guidance.
- Prevent a high skills score from averaging away a hard work-right or mandatory-requirement blocker.
- Allow the user to correct inferred candidate or vacancy facts and persist approved corrections.
- Preserve a decision record so later application and outcome events can be traced to the original reasoning.

### Quality standard

EU Fit must be explainable, correctable and conservative where evidence is incomplete. A numerical score may summarize supporting factors, but it must remain secondary to blockers and the categorical decision.

### Acceptance gates

- No decision is produced without the minimum required evidence defined by the capability-readiness policy.
- Every hard blocker identifies its triggering fact and evidence status.
- Every governed mobility statement exposes source and freshness information.
- Users can distinguish verified, inferred, user-declared and unknown facts.
- Correction, override and disagreement reasons are measurable.
- High-risk conclusions receive scenario-based QA and human subject-matter review before their jurisdiction is marketed as supported.

## Investment pillar 2: evidence integrity

### User outcome

The candidate can trust that AutoTime will not invent credentials, achievements, responsibilities, dates, tools, metrics or work-right claims.

### Required product behavior

- Maintain a reusable candidate evidence record from CVs, structured profile data and candidate-confirmed additions.
- Classify evidence as verified, user-declared, inferred, conflicting, outdated or missing.
- Link every material generated claim to supporting evidence.
- Block unsupported claims rather than silently weakening or fabricating them.
- Ask for confirmation when a defensible statement depends on ambiguous evidence.
- Make conflicts visible and require resolution before affected content can be approved.
- Provide an edit explanation for material tailoring changes.
- Preserve the original evidence and an audit trail of corrections, approvals and generated versions.
- Require explicit human approval before export, autofill confirmation or submission.
- Keep sensitive candidate content out of telemetry and error payloads.

### Quality standard

The system must prefer an honest gap or blank field over a plausible invention. Traceability must be understandable to a candidate, not only visible in internal logs.

### Acceptance gates

- Zero confirmed unsupported-claim incidents in release evaluation.
- All material application claims have an evidence reference or are visibly awaiting confirmation.
- Generated content cannot convert inferred evidence into verified evidence without user action.
- Edits to identity, employment dates, qualifications, work rights and quantified achievements receive high-risk treatment.
- Candidate data deletion, retention and export behavior match published privacy commitments.

## Investment pillar 3: application preparation

### User outcome

After accepting a role decision, the candidate receives a focused, truthful application kit that is ready for efficient human review.

### MVP application kit

- Vacancy-specific CV or CV recommendations.
- Concise cover letter when appropriate.
- Draft screening-question answers.
- Positioning summary linking the strongest requirements to candidate evidence.
- Visible unresolved gaps and fields intentionally left blank.
- Export or reviewed autofill handoff; never silent submission.

### Required product behavior

- Reuse the EU Fit decision, blockers and evidence map instead of performing a disconnected second analysis.
- Prioritize vacancy requirements rather than generic keyword insertion.
- Preserve the candidate's factual meaning and allow tone/style control without factual expansion.
- Explain material inclusions, exclusions and rewrites.
- Group stable, previously confirmed facts for efficient review.
- Highlight changed, inferred, sensitive and high-risk fields for exception-based review.
- Ensure the candidate reviews the final destination form after ATS redirects.
- Record kit generation, approval, export, marked-applied status and subsequent outcome.

### Quality standard

Application preparation must optimize relevance, integrity and review efficiency—not the number of applications submitted.

### Acceptance gates

- No kit is generated for a `Skip` decision without an explicit user override and recorded reason.
- Hard blockers remain visible throughout preparation.
- All generated artifacts pass evidence-integrity checks.
- The user controls export and submission.
- ATS-safe output is verified against supported formats and platforms.
- Preparation time and abandonment are measurable without capturing sensitive document content in analytics.

## Supporting capabilities

These capabilities remain necessary but should be deliberately constrained:

| Capability | Required role | Scope rule |
| --- | --- | --- |
| Onboarding/profile | Supply minimum candidate evidence | Progressive; do not require phone or LinkedIn for the first decision unless needed by an actual action. |
| Browser extension | Capture a vacancy and assist reviewed form completion | Reliability on prioritized platforms before breadth; no auto-submit or LinkedIn scraping. |
| Dashboard | Present role decisions, kits, next actions and outcomes | Organize around a role record, not multiple competing task systems. |
| Tracking | Close the learning loop | Use a simple status model: assessed, applied, interview, rejected, offer. |
| Billing | Test willingness to pay | Begin with a simple free allowance and one paid offer; hide internal credit mechanics where possible. |
| Administration | Correct evidence, support users and audit incidents | Only controls required for beta safety and operations. |
| Analytics | Measure activation, trust, preparation and outcomes | Event metadata only; exclude CV and vacancy contents and other sensitive payloads. |
| Observability | Detect failures across the core loop | Redact candidate evidence and maintain actionable service/platform error categories. |

## Explicit non-goals for this investment phase

The following must not consume core roadmap capacity unless evidence shows they are required to validate or operate the core loop:

- Silent or high-volume auto-apply.
- Automated application submission.
- LinkedIn scraping or application automation.
- Broad recruiter/contact scraping.
- Standalone outreach automation.
- A comprehensive career-pathway product.
- Voice, video or pseudo-scientific interview scoring.
- A broad interview-coaching suite.
- Native mobile applications.
- Employer/recruiter products.
- Supporting every European jurisdiction at equal depth.
- Expanding platform logos without measured capture and handoff reliability.
- Complex pricing tiers, add-ons or customer-facing credit mechanics.
- Rebuilding free Europass/EURES functionality without a differentiated reason.

Existing implementations outside the core do not need immediate deletion. They should be classified as supporting, experimental, hidden from the primary journey or maintenance-only. No expansion should occur without an approved evidence-based exception.

## Prioritization rule

Every proposed initiative must answer all five questions:

1. Which core-loop user outcome does it improve?
2. Which observed user problem or measured failure supports it?
3. What metric should change if it works?
4. Can the outcome be achieved with a smaller change?
5. What core investment would be delayed by doing it?

An initiative enters committed delivery only when it materially improves decision accuracy, evidence integrity, application preparation, the transition between those stages, or safe operation of that loop.

Suggested scoring:

| Dimension | Weight |
| --- | ---: |
| Core-loop outcome impact | 30% |
| Trust, safety or evidence-integrity impact | 25% |
| Observed customer evidence | 20% |
| Reach within the target segment | 10% |
| Delivery confidence | 10% |
| Operational cost reduction | 5% |

Work that fails the core-loop relevance test is deferred regardless of its total score.

## Delivery plan

### Phase 1 — compress and instrument

- Make vacancy analysis the default first action.
- Enable a first decision from vacancy, CV/evidence and country with minimal setup.
- Present decision, decisive blocker and next action before supporting detail.
- Establish the fact/evidence status model and claim traceability.
- Connect EU Fit, application kit and role outcome through one role identifier.
- Instrument the funnel with consent and privacy-safe events.
- Establish country/source coverage and freshness reporting.

**Exit condition:** A beta user can reach an understandable first decision in under five minutes, and the team can trace the journey without inspecting sensitive content.

### Phase 2 — establish trust and preparation quality

- Add user correction and decision-override workflows.
- Implement exception-based application review.
- Validate unsupported-claim controls with adversarial and regression tests.
- Test prioritized country scenarios with qualified human review.
- Test capture-to-reviewed-form handoff on the most-used platforms and ATS redirects.
- Conduct observed beta sessions and record comprehension, trust and behavioral change.

**Exit condition:** Users understand the recommendation, material claims remain supported, and preparation reliably reaches human-approved output.

### Phase 3 — prove commercial and outcome value

- Run a defined paid/private-beta cohort.
- Compare preparation time and application outcomes with each candidate's stated baseline.
- Measure return for a second role and continued use during an active search.
- Test simple pricing based on outcomes users understand, such as assessments and application kits.
- Review support cost, source-maintenance cost and AI cost per completed core loop.

**Exit condition:** The core cohort demonstrates repeat use, trust, willingness to pay and a useful behavioral or application outcome. Public outcome claims remain prohibited until sample size and methodology are reviewed.

## Measurement framework

### North-star metric

**Weekly evidence-ready applications:** user-submitted applications for which the candidate reviewed the EU Fit decision, resolved or accepted material blockers, and approved supporting evidence.

This metric rewards quality and completion without rewarding mass submission.

### Core metrics

| Area | Metric | Initial beta target |
| --- | --- | ---: |
| Activation | Median time from entry to first EU Fit decision | Under 5 minutes |
| Activation | First-session decision completion | At least 70% |
| Comprehension | Users who correctly explain the recommendation and reason | At least 80% |
| Trust | Decisions accepted without factual correction | Baseline first; improve by cohort |
| Safety | Confirmed unsupported material claims | Zero |
| Action | `Apply` decisions progressing to an approved kit | At least 60% |
| Completion | Approved kits progressing to marked applied | At least 50% |
| Retention | Candidates returning with a second role within four weeks | At least 40% |
| Efficiency | Median vacancy-to-approved-kit time | Baseline and reduce |
| Reliability | Core-loop failures by platform, country and stage | Report every release |
| Commercial | Activated users converting to paid | Establish during paid pilot |
| Outcome | Recruiter response, interview and offer rate | Observe by cohort; no public target claim yet |

Decision overrides, user corrections and `Skip` outcomes are learning signals. They must not be suppressed to improve a headline accuracy number.

### Outcome evidence standard

Feature completion and automated tests prove that software functions; they do not prove customer impact. Outcome evidence must come from consented real-user cohorts and link:

`decision -> user action -> reviewed application -> recruiter response -> interview -> offer/rejection`

For every published outcome claim, document cohort definition, sample size, observation window, exclusions, baseline, calculation and limitations.

## Research and data governance

EU mobility guidance is a continuously maintained product dependency.

- Prefer official government, EU and recognized public-employment sources.
- Record jurisdiction, source owner, URL, retrieval date, review date and applicability.
- Define review frequency based on legal/operational volatility.
- Expire or downgrade stale conclusions instead of presenting them as current facts.
- Separate general information from candidate-specific legal advice.
- Provide the official verification path when facts are uncertain or consequential.
- Maintain a correction and incident process for inaccurate guidance.

Country coverage is complete only when its supported scenarios, exclusions, sources, review owner and quality evidence are documented.

## Quality and release gates

A release affecting the core loop requires:

- Unit and integration coverage for changed decision and evidence rules.
- End-to-end verification from vacancy capture through approved kit and outcome status.
- Adversarial unsupported-claim tests.
- User-isolation, authorization and sensitive-data-redaction checks.
- Accessibility verification for decisions, blocker states, evidence review and form errors.
- Mobile/responsive verification for the dashboard workflow.
- Platform-specific tests for affected capture/autofill integrations.
- Human review of changed high-risk mobility scenarios.
- Monitoring, rollback and incident-owner confirmation.

Public launch additionally requires real-user UAT, production billing/email/observability verification, privacy/compliance sign-off and documented outcome-usefulness evidence.

## Primary risks and controls

| Risk | Consequence | Control |
| --- | --- | --- |
| False eligibility certainty | Candidate wastes effort or relies on incorrect guidance | Categorical decisions, unknown state, official sources, freshness, qualified review and correction path. |
| Unsupported generated claim | Reputational harm or misleading application | Claim-to-evidence links, hard blocking, explicit confirmation and audit trail. |
| Feature dilution | Core value remains unproven | Non-goals, prioritization gate and core-loop roadmap capacity. |
| Score false precision | Users misunderstand uncertainty | Decision and blockers first; score secondary; show confidence and missing facts. |
| Integration drift | Capture or autofill silently fails | Capability-specific coverage, monitored fixtures and platform error reporting. |
| Sensitive-data leakage | Privacy, compliance and trust failure | Data minimization, RLS, server-side boundaries and telemetry redaction. |
| Outcome overclaiming | Regulatory and reputational exposure | Claims register and cohort-based evidence standard. |
| Maintenance economics | Support/source costs exceed revenue | Measure cost per completed loop and restrict supported scope. |

## Ownership and decision rights

| Area | Accountable owner | Required responsibility |
| --- | --- | --- |
| Product promise and roadmap | Founder/Product lead | Protect scope, approve positioning and prioritize evidence. |
| EU Fit rules and decision UX | Product + Engineering | Correct, explainable, testable decisions and overrides. |
| Mobility-source governance | Named research/compliance owner | Coverage, freshness, citations, exclusions and incident response. |
| Evidence-integrity system | Engineering lead | Provenance model, generation guardrails and auditability. |
| Application quality | Product/Content + QA | Relevance, truthfulness, review efficiency and output acceptance. |
| Security and privacy | CTO/Engineering owner | Isolation, retention, redaction and incident handling. |
| Outcome measurement | Product/Data owner | Event definitions, cohort methodology and claims evidence. |
| Release decision | CTO + Product | Technical, user, operational and compliance gate sign-off. |

In a founder-led team one person may hold multiple roles, but each responsibility must still have an explicit name and review cadence.

## Product-language rules

### Approved

- “Better applications. Clearer cross-border decisions.”
- “Evidence-backed application support for European tech roles.”
- “Explainable mobility guidance with human review before submission.”
- “Apply, investigate, improve or skip—with the reasons shown.”

### Not approved without evidence or qualification

- “Guaranteed eligibility.”
- “Legal advice.”
- “Works everywhere in Europe.”
- “Supports every job site.”
- “Gets you more interviews.”
- “Increases your chance of being hired.”
- “Automatically applies for you.”

## Definition of strategy success

This strategy succeeds when target candidates repeatedly bring real vacancies to AutoTime, understand and trust the role decision, approve a supported application without fabricated claims, act on the result, and return for another role. Commercial success additionally requires that enough of those users pay at a price that covers AI, support, source governance and integration maintenance.

Until that evidence exists, AutoTime remains a controlled-beta MVP. New feature breadth is not evidence of product validation.

## Related governing and evidence documents

- [Product capability readiness policy](reference/product-readiness-policy.md)
- [Product information architecture](reference/product-information-architecture.md)
- [Product onboarding workflow](reference/product-onboarding-workflow.md)
- [Product engineering review](reports/product-engineering-review-2026-09-09.md)
- [CTO assessment](reports/cto-assessment-2026-09-09.md)
- [QA 360 defect assessment](reports/qa-360-defect-assessment-2026-09-09.md)
- [Private beta readiness report](reference/testing/private-beta-v1-readiness-report.md)
- [Outcome quality test matrix](reference/testing/outcome-quality-test-matrix.md)
- [Release readiness](reference/release-readiness.md)
