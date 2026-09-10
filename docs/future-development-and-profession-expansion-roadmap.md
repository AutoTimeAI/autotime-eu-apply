# AutoTime EU Apply — future development and profession expansion roadmap

**Decision date:** 9 September 2026  
**Status:** Strategic roadmap  
**Planning horizon:** Private beta to multi-profession platform  
**Primary dependency:** Successful validation of EU Fit, evidence integrity and application preparation

## Executive direction

AutoTime EU Apply should launch as a focused product for technology and FinTech professionals while being engineered around an occupation-neutral core.

The product is not permanently restricted to technical candidates. Its foundational workflow can serve many professions:

`candidate evidence + vacancy + country context -> viability decision -> evidence-backed application -> human submission -> outcome learning`

Expansion must occur in controlled phases. AutoTime should not market itself to “everyone” until its evidence model, decision rules, application outputs, source governance and quality assurance have been validated for each new professional group.

The strategic sequence is:

1. Prove the core with Tech and FinTech candidates.
2. Expand into adjacent, non-regulated professional roles.
3. introduce configurable occupation modules.
4. Enter regulated professions only with specialist rules and governance.
5. Become a trusted multi-profession European mobility and application platform.

## Long-term product vision

> **A trusted cross-border job decision platform that helps professionals understand where they can work, what they can prove and how to apply truthfully across Europe.**

The future product should combine a universal decision platform with occupation-specific intelligence. It must not reduce every profession to generic keyword matching.

## Product architecture principle

```text
AutoTime universal core
├── Candidate identity and evidence graph
├── Vacancy and requirement model
├── Country, work-right and sponsorship assessment
├── Decision, blocker, uncertainty and confidence model
├── Evidence-backed application preparation
├── Human review and submission boundary
├── Outcome and correction learning loop
└── Security, privacy, billing and observability

Occupation intelligence modules
├── Technology and FinTech
├── Digital and general professional roles
├── Business and commercial roles
├── Licensed engineering and technical trades
├── Healthcare
├── Education
├── Legal and compliance
└── Other regulated professions
```

The universal core owns shared facts and workflow. Occupation modules add terminology, evidence types, qualifications, mandatory requirements, output conventions and specialized quality rules.

## Universal capabilities

The following capabilities should remain profession-independent:

- Candidate profile and evidence import.
- Vacancy capture and requirement extraction.
- Work authorization, sponsorship, location and language assessment.
- Hard-blocker, soft-gap and uncertainty classification.
- `Apply`, `Investigate`, `Improve` and `Skip` decisions.
- Claim-to-evidence traceability.
- Unsupported-claim prevention.
- Vacancy-specific CV and application preparation.
- Explicit human review and user-controlled submission.
- Application and outcome tracking.
- Corrections, overrides, provenance and audit history.
- Privacy, security, accessibility and observability controls.

Universal does not mean identical. Each profession may assign different weight or legal significance to the same evidence.

## Initial specialization: technology and FinTech

### Why this is the launch segment

- Candidate evidence commonly includes skills, tools, systems, projects and measurable delivery.
- Vacancy requirements are comparatively structured and suitable for explainable matching.
- Cross-border hiring and sponsorship questions are common.
- Existing product language, examples, integrations and test data already favor this segment.
- Technical and FinTech roles allow the team to validate the core without immediately assuming the obligations of multiple licensed professions.

### Initial supported role families

- Software engineering.
- Data engineering, analytics and data science.
- Cybersecurity.
- Cloud, infrastructure, DevOps and platform engineering.
- QA, test engineering and quality leadership.
- Product management and technical product roles.
- Business and systems analysis.
- Technology consulting and implementation.
- FinTech product, operations, risk technology and implementation roles.

### Evidence model

The initial evidence model should understand:

- Employment history and responsibility scope.
- Technical skills, tools, platforms and methods.
- Projects, portfolios and open-source work.
- Qualifications, certifications and training.
- Quantified delivery outcomes with source confirmation.
- Industry and domain exposure.
- Leadership, collaboration and stakeholder evidence.
- Language, location, work-right and sponsorship facts.

## Phase roadmap

### Phase 0 — foundation and scope control

**Purpose:** Establish the platform boundaries required for safe specialization.

#### Deliverables

- Canonical universal evidence schema.
- Fact states: verified, user-declared, inferred, conflicting, stale and unknown.
- Requirement classes: mandatory, preferred, contextual and ambiguous.
- Blocker hierarchy that prevents mandatory constraints being averaged away.
- Occupation taxonomy strategy using ESCO or another governed reference where appropriate.
- Country/source registry with jurisdiction, freshness and review ownership.
- Core event and outcome model.
- Feature-flag mechanism for occupation and country availability.
- Product language and claims register.

#### Exit gate

The universal core can represent Tech/FinTech evidence and decisions without embedding role-specific assumptions in shared work-right, evidence-integrity or workflow logic.

### Phase 1 — Tech and FinTech core validation

**Purpose:** Prove that the narrow product creates trusted, repeatable customer value.

#### Customer workflow

1. Capture or paste a vacancy.
2. Import or confirm candidate evidence.
3. Select or confirm country and work-right context.
4. Receive an explainable EU Fit decision.
5. Correct facts or resolve uncertainties.
6. Prepare an evidence-backed application kit.
7. Review and submit manually.
8. Record response, interview, rejection or offer.

#### Investment priorities

- EU Fit decision accuracy and comprehension.
- Work-right and sponsorship uncertainty handling.
- Evidence provenance and unsupported-claim blocking.
- Vacancy-specific application quality.
- Fast activation and exception-based review.
- Reliable capture and handoff on prioritized platforms.
- Privacy-safe outcome instrumentation.

#### Exit gate

Proceed only when a defined beta cohort demonstrates:

- median first-decision time under five minutes;
- at least 70% first-session decision completion;
- at least 80% recommendation comprehension;
- zero confirmed unsupported material claims;
- at least 40% four-week return for a second role;
- repeat use across more than one Tech/FinTech role family;
- evidence of willingness to pay; and
- acceptable support, AI and source-maintenance cost per completed workflow.

These are initial planning thresholds, not public claims.

### Phase 2 — adjacent digital and professional roles

**Purpose:** Test whether the validated core generalizes to low-regulation professions with similar evidence patterns.

#### Candidate role families

- UX, product and service design.
- Digital marketing and growth.
- Project and program management.
- Customer success and implementation.
- Sales engineering and solutions consulting.
- Business operations and transformation.
- General management consulting.
- Technical writing and developer relations.

#### Required development

- Expand evidence types beyond technical tools and projects.
- Support portfolios, campaigns, commercial outcomes and stakeholder evidence.
- Adapt requirement extraction and application language by role family.
- Add profession-specific examples and adversarial test fixtures.
- Validate that Tech terminology and scoring do not bias recommendations.
- Introduce occupation-specific output templates only where user research supports them.

#### Entry gate

- Phase 1 metrics are stable for at least two consecutive cohorts.
- At least 10 qualified target users in the proposed adjacent segment demonstrate the same core problem.
- Manual concierge assessments show that the existing core represents at least 80% of required evidence and decisions.
- The new segment does not require professional licensure decisions.

#### Exit gate

- Decision comprehension and claim-integrity performance remain within the Phase 1 quality boundary.
- The segment demonstrates repeat use and willingness to pay.
- No material degradation occurs for existing Tech/FinTech users.

### Phase 3 — configurable occupation intelligence platform

**Purpose:** Turn repeated profession-specific patterns into governed modules rather than hard-coded exceptions.

#### Platform capabilities

- Versioned occupation-module contracts.
- Profession-specific evidence and requirement extensions.
- Role-family terminology and synonym dictionaries.
- Qualification, certification and portfolio rules.
- Profession-specific blocker and uncertainty policies.
- Output conventions and review checklists.
- Test packs and release gates per module.
- Module-level analytics, corrections and incidents.
- Country-by-occupation coverage matrices.

#### Module contract

Every occupation module must declare:

- supported roles and exclusions;
- required and optional evidence;
- mandatory and preferred requirements;
- protected or regulated terms;
- applicable countries and limitations;
- authoritative sources and review schedule;
- decision rules and uncertainty behavior;
- application-output conventions;
- accessibility and localization requirements;
- test fixtures, expected results and accountable owner.

#### Exit gate

A new low-risk profession can be introduced through configuration and governed content without changing universal decision semantics or weakening evidence-integrity controls.

### Phase 4 — selected regulated professions

**Purpose:** Support professions where qualification recognition, registration, licensing or public safety materially changes employability.

#### Candidate verticals

Enter one vertical at a time. Possible future modules include:

| Vertical | Additional intelligence required |
| --- | --- |
| Healthcare | Registration body, qualification recognition, specialty, language, supervised-practice and patient-safety requirements. |
| Education | Teaching registration, safeguarding, background checks, curriculum and language requirements. |
| Legal | Jurisdiction, reserved activities, bar/solicitor qualification and practice-right rules. |
| Accounting/regulated finance | Chartered qualifications, regulatory permissions, fit-and-proper requirements and local reporting standards. |
| Licensed engineering | Protected titles, recognition bodies, safety obligations and sector-specific accreditation. |
| Skilled trades | Trade certificates, licence categories, health-and-safety credentials and local recognition. |
| Transport | Licence validity, professional-driver requirements, medical checks and regulated working conditions. |

#### Mandatory entry controls

- Named subject-matter or compliance owner.
- Qualified external review where internal competence is insufficient.
- Authoritative regulator and government sources.
- Scenario-specific legal-information boundaries.
- Jurisdiction and role exclusions that are visible to users.
- Formal source-freshness and incident-response service levels.
- Human escalation for ambiguous high-consequence cases.
- Insurance, terms, privacy and regulatory review appropriate to the vertical.
- Dedicated test data that does not expose real candidate information.

#### Entry gate

No regulated vertical enters beta because of market size alone. It requires demonstrated demand, a sustainable governance model, qualified review capacity and an approved risk assessment.

#### Exit gate

The vertical achieves its own signed quality, safety, correction, retention and commercial thresholds. Success in Tech/FinTech cannot substitute for profession-specific validation.

### Phase 5 — multi-profession European platform

**Purpose:** Operate multiple proven modules through one trustworthy platform while preserving clear boundaries.

#### Future capabilities

- Candidate-controlled evidence passport reusable across roles and countries.
- Transparent comparison of role viability across selected European markets.
- Profession-aware qualification and skills-transfer pathways.
- Permissioned interoperability with services such as Europass and relevant public-employment systems.
- Multilingual vacancy interpretation and application preparation with evidence preservation.
- Candidate-specific change alerts when a relevant source or rule changes.
- Aggregated, privacy-preserving insight into skill and mobility barriers.
- Partner APIs for approved career services, education providers or mobility specialists.

#### Strategic constraint

The platform must remain a decision and evidence layer. Expansion must not turn it into an indiscriminate job board, high-volume auto-apply engine or unqualified legal-advice service.

## Expansion decision framework

Before approving a new profession, score and document:

| Dimension | Question |
| --- | --- |
| Customer pain | Is cross-border viability or evidence interpretation a frequent, consequential problem? |
| Core fit | Can the universal workflow solve most of the journey? |
| Evidence structure | Can material claims and requirements be represented and traced reliably? |
| Regulation | What licensing, recognition, safety or legal obligations apply? |
| Source quality | Are authoritative, maintainable sources available? |
| Validation access | Can the team recruit enough users and qualified reviewers? |
| Distribution | Is there a credible way to reach the segment? |
| Economics | Can expected revenue cover support, AI, research and governance costs? |
| Brand coherence | Does the segment strengthen the cross-border decision proposition? |

A segment should not enter development when regulation or source governance is unresolved, even if demand appears high.

## Product experience evolution

### Near term

- Show “Analyse a role” as the primary action.
- Ask the candidate to select a role family when it improves interpretation.
- Make coverage and limitations visible before analysis.
- Keep one role record across decision, application and outcome.

### Medium term

- Personalize evidence prompts by occupation module.
- Compare viable countries and roles without implying legal certainty.
- Recommend evidence gaps to resolve before application preparation.
- Let users maintain multiple professional profiles or career directions without duplicating verified evidence.

### Long term

- Build a candidate-owned evidence graph that maps achievements to occupations, requirements and jurisdictions.
- Reuse confirmed evidence across languages and application formats.
- Explain how a candidate's evidence transfers between occupations and countries.
- Notify users when previously assessed conclusions may have become stale.

## Technology evolution

### Shared domain platform

- Keep shared evidence, requirement, decision and outcome schemas versioned.
- Separate universal policy from occupation and jurisdiction configuration.
- Record model, prompt, ruleset and source versions for reproducibility.
- Use deterministic rules for hard constraints and AI for bounded extraction, explanation and drafting.
- Require structured outputs and schema validation at every AI boundary.

### Data and learning

- Learn from explicit corrections and outcomes, not silent behavioral inference.
- Prevent one profession's patterns from contaminating another's recommendations.
- Evaluate extraction and generation quality separately by role family, country and language.
- Maintain holdout scenarios for regression and bias testing.
- Do not train on candidate content without clear consent and governance.

### Integration strategy

- Prioritize stable import/export and capture flows over platform-count marketing.
- Report capture, extraction, autofill and submission support separately.
- Preserve human submission across every phase.
- Explore official or permissioned integrations before scraping.

## Quality, fairness and accessibility

Every phase must evaluate:

- False hard blockers and missed mandatory blockers.
- Differences in decision quality across nationality, work-right status, gender-coded language, disability-related needs, career gaps and non-traditional education.
- Qualification and experience equivalence across countries.
- Language clarity for non-native English users.
- Keyboard, screen-reader, zoom, contrast and cognitive accessibility.
- Unsupported claims, conflicting evidence and hallucinated requirements.
- Privacy and retention of sensitive employment and immigration information.

Fairness work must not remove legitimate legal or mandatory-job constraints. It must make their source, applicability and uncertainty explicit while preventing proxy assumptions.

## Commercial evolution

### Phase 1 commercial model

- Simple free allowance.
- One paid individual plan or clearly priced application/assessment package.
- Measure willingness to pay after the user experiences the core decision.

### Later options

- Profession-specific premium modules.
- Country or mobility research packs where the value is clear.
- Approved adviser-assisted review for high-consequence cases.
- Partnerships with training, relocation or career-support providers, subject to conflict-of-interest disclosure.
- Institution or outplacement plans only after individual product value is proven.

Pricing must remain understandable in user outcomes. Internal AI credits should not dominate customer-facing packaging.

## Roadmap governance

### Quarterly review

Review:

- core-loop metrics and cohort outcomes;
- decision corrections and harmful-error incidents;
- source freshness and jurisdiction coverage;
- cost per completed workflow;
- user requests by role family;
- platform reliability;
- deferred-feature pressure; and
- whether the evidence supports entering, continuing or exiting an expansion phase.

### Stop conditions

Pause or reverse an expansion when:

- decision accuracy or comprehension materially declines;
- unsupported-claim incidents occur;
- qualified governance cannot be maintained;
- source freshness falls outside the documented service level;
- the segment does not return or pay after activation;
- support costs exceed sustainable economics; or
- expansion delays correction of core safety and reliability issues.

Stopping a module is a valid product decision. Coverage breadth is not the primary success measure.

## Success measures by horizon

| Horizon | Primary evidence of success |
| --- | --- |
| Tech/FinTech MVP | Fast, trusted decisions; supported applications; repeat role use; willingness to pay. |
| Adjacent professions | Core metrics retained without Tech bias or major custom engineering. |
| Occupation platform | New low-risk modules delivered through a stable contract and independent test pack. |
| Regulated vertical | Qualified governance, low harmful-error rate and sustainable commercial demand. |
| Multi-profession platform | Multiple profitable modules sharing the universal core without weakening trust. |

## Immediate next actions

1. Approve Tech/FinTech as the only marketed launch segment.
2. Define the initial role-family and country coverage matrix.
3. Audit shared schemas for hidden Tech-only assumptions.
4. Establish fact, evidence, requirement and occupation-module contracts.
5. Add role-family tags to beta events and outcome reporting.
6. Recruit the Phase 1 beta cohort across several Tech/FinTech role families.
7. Create a backlog boundary that labels work as core, supporting, experimental or deferred.
8. Begin discovery interviews for one adjacent low-regulation segment without committing development.
9. Prohibit regulated-profession marketing until the Phase 4 entry controls are satisfied.

## Final decision

AutoTime should be **focused in market and universal in architecture**.

Tech and FinTech provide the initial proving ground. Adjacent professional roles are the next controlled expansion. Regulated professions require dedicated intelligence, qualified oversight and independent evidence. The long-term opportunity is a multi-profession European decision and application platform, but only if every expansion preserves the product's core trust contract:

> Explain viability, show uncertainty, protect evidence integrity and keep the candidate in control.

## Related documents

- [Core product investment strategy](product-core-investment-strategy.md)
- [Product capability readiness policy](reference/product-readiness-policy.md)
- [Product information architecture](reference/product-information-architecture.md)
- [Product engineering review](reports/product-engineering-review-2026-09-09.md)
- [CTO assessment](reports/cto-assessment-2026-09-09.md)
- [Outcome quality test matrix](reference/testing/outcome-quality-test-matrix.md)
