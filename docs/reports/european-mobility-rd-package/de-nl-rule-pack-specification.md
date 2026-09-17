# Germany–Netherlands Rule-Pack Specification

**Release state:** research-only specification  
**Scope:** pre-application triage for technology vacancies, not visa advice or approval prediction

## Product boundary

This specification converts current official material into testable product requirements. It is not
an approved legal rule pack. Every rule version needs internal reconciliation, qualified
jurisdiction review, signed test cases and production monitoring before customer-facing eligibility
language is permitted.

The existing `CountryPack` citation/checklist model should remain the presentation layer. A new
versioned rule-bundle layer must own values, predicates, effective dates and decisions. No current
threshold should be hard-coded into UI components or generic country configuration.

## Canonical evaluation outcome

The route evaluator returns one of:

- `criteria_indicated` — all encoded criteria pass, but no grant is predicted;
- `criteria_not_indicated` — at least one deterministic encoded criterion fails;
- `verification_required` — a material fact is missing, ambiguous, stale or outside automation;
- `route_not_evaluated` — route/version is unavailable, unsigned, expired or out of scope.

`Apply`, `Investigate first`, `Stretch application` and `Skip` remain product-priority decisions and
must not be aliases for legal eligibility.

## Required input contract

| Input                           | Type                                        | Evidence requirement                                       | Missing behaviour                          |
| ------------------------------- | ------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| nationality/work-right position | enum + evidence reference                   | Candidate declaration; document verification optional      | `verification_required`                    |
| destination                     | ISO country                                 | Vacancy/employing entity                                   | Route not evaluated if unclear             |
| employing legal entity          | text + entity ID                            | Vacancy plus authoritative register where applicable       | Sponsor status unknown                     |
| role title and duties           | text + spans                                | Full vacancy or employer confirmation                      | Occupation mapping unknown                 |
| occupation mapping              | code + confidence + method                  | Human-confirmed for low/medium confidence                  | No shortage/IT exception inferred          |
| gross compensation              | amount, currency, period, included elements | Contract/offer preferred; vacancy is provisional           | Salary criterion unknown                   |
| contract duration               | months + evidence span                      | Contract/offer or employer confirmation                    | Duration criterion unknown                 |
| qualification                   | type, institution, date, comparability      | Candidate evidence plus official assessment where required | Qualification criterion unknown            |
| relevant experience             | dated periods, duties, evidence             | CV is declared; references/contracts stronger              | Experience exception unknown               |
| regulated profession            | true/false/unknown + mapping                | Official occupation classification                         | Unknown blocks positive route conclusion   |
| intended application date       | date                                        | Candidate plan                                             | Select rule version effective on that date |

## Germany: EU Blue Card (§18g)

### Atomic rule candidates

| ID       | Predicate                                    | Current 2026 research value                                 | Source                                  |
| -------- | -------------------------------------------- | ----------------------------------------------------------- | --------------------------------------- |
| DE-BC-01 | Concrete German job offer exists             | Required                                                    | Residence Act §18(2), §18g              |
| DE-BC-02 | Employment duration is at least six months   | `>= 6 months`                                               | Residence Act §18g(3)[^1]               |
| DE-BC-03 | Work is appropriate to qualification         | Required                                                    | Official Blue Card guidance[^2]         |
| DE-BC-04 | General gross annual salary                  | `>= EUR 50,700`                                             | 2026 official guidance[^2]              |
| DE-BC-05 | Lower-threshold salary                       | `>= EUR 45,934.20`                                          | 2026 official guidance[^2]              |
| DE-BC-06 | Lower band applies to listed shortage groups | ISCO groups in §18g(1)                                      | Residence Act §18g(1)[^1]               |
| DE-BC-07 | Lower band applies to recent graduates       | Last qualifying award within three years                    | Residence Act §18g(1)[^1]               |
| DE-BC-08 | BA approval applies to lower band            | Required, subject to statutory handling                     | Residence Act/official guidance[^1][^2] |
| DE-BC-09 | IT experience alternative                    | ISCO 133/25; three years in prior seven at comparable level | Residence Act §18g(2)[^1]               |
| DE-BC-10 | Foreign degree comparability                 | anabin evidence or ZAB statement                            | Official recognition guidance[^3]       |
| DE-BC-11 | Regulated profession permission              | In place or promised as officially required                 | Official Blue Card guidance[^2]         |

### Essential modelling distinctions

- Do not confuse the Blue Card IT-experience alternative (three years in seven) with the separate
  §19c(2)/BeschV practical-knowledge route (official guidance describes two years in five and a
  distinct 2026 salary/tariff treatment).[^4]
- Treat gross annual salary as a route fact. Do not convert monthly or hourly pay without explicit
  guaranteed hours and a documented normalisation policy.
- Store the statutory percentage formula and the published annual value. The formula is the rule;
  the number is a dated parameter.
- A role title containing “software” is not sufficient to assign ISCO 25. Duties and mapping evidence
  control.
- A degree being unnecessary to practise a non-regulated profession does not mean comparability is
  unnecessary for the academic Blue Card route.[^3]

## Netherlands: Highly Skilled Migrant (kennismigrant)

### Atomic rule candidates

| ID        | Predicate                                           | Current 2026 research value                                                    | Source                                |
| --------- | --------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------- |
| NL-HSM-01 | Dutch employment contract exists                    | Required                                                                       | IND HSM guidance[^5]                  |
| NL-HSM-02 | Employer is IND-recognised sponsor                  | Required for HSM                                                               | IND HSM guidance and register[^5][^6] |
| NL-HSM-03 | General threshold age 30+                           | `>= EUR 5,942/month` excluding holiday pay                                     | IND 2026 amounts[^7]                  |
| NL-HSM-04 | General threshold under age 30                      | `>= EUR 4,357/month` excluding holiday pay                                     | IND 2026 amounts[^7]                  |
| NL-HSM-05 | Reduced HSM criterion                               | `>= EUR 3,122/month` excluding holiday pay                                     | IND 2026 amounts[^7]                  |
| NL-HSM-06 | Reduced category conditions                         | Orientation-year/qualifying graduate/research conditions and three-year window | IND amounts guidance[^7]              |
| NL-HSM-07 | Salary is market-conform                            | Required; may require UWV assessment                                           | IND HSM/background guidance[^5][^8]   |
| NL-HSM-08 | Included pay is fixed, contractual and paid monthly | Conditions apply                                                               | IND amounts guidance[^7]              |
| NL-HSM-09 | Holiday allowance/in-kind/uncertain pay excluded    | Excluded                                                                       | IND amounts guidance[^7]              |

### Sponsor assertion semantics

An entry in the IND work register means the named organisation is recognised as a sponsor for work
purposes on the register observation date. The register is updated monthly.[^6] It does **not** prove
that:

- a different group company or recruiter is the employing entity;
- this vacancy offers sponsorship;
- the employer will apply for this candidate;
- salary is market-conform;
- recognition will remain current; or
- the application will succeed.

The product must display the legal name, KVK number, exact/alias/manual match method, confidence,
register version and checked date. Only an exact KVK match or manually confirmed legal-entity match
may use `register_match_confirmed`.

## Netherlands: EU Blue Card

Keep this as a separate route from HSM:

| ID       | Predicate                                    | Current 2026 research value                                                      | Source                     |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------- |
| NL-BC-01 | Employer recognition                         | Not mandatory for Blue Card                                                      | IND Blue Card guidance[^9] |
| NL-BC-02 | General monthly threshold                    | `>= EUR 5,942` excluding holiday pay                                             | IND amounts guidance[^7]   |
| NL-BC-03 | Reduced recent-graduate threshold            | `>= EUR 4,754` excluding holiday pay                                             | IND amounts guidance[^7]   |
| NL-BC-04 | Contract duration                            | `>= 6 months`                                                                    | IND Blue Card guidance[^9] |
| NL-BC-05 | Qualification/experience                     | 3-year higher education; or five years; IT managers/professionals three in seven | IND Blue Card guidance[^9] |
| NL-BC-06 | Employer activity and enforcement exclusions | Economic activity; specified five-year fine exclusions                           | IND Blue Card guidance[^9] |

The same salary may indicate both HSM age-30+ and general Blue Card thresholds in 2026, but the routes
are not interchangeable. Sponsor recognition, qualification, mobility benefits and employer tests
differ.

## Rule-bundle data contract

```ts
type RuleBundle = {
  bundleId: string;
  jurisdiction: "DE" | "NL";
  routeId: string;
  semanticVersion: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  knowledgeCutoff: string;
  status: "draft" | "internally_verified" | "expert_signed" | "retired";
  sourceRevisionIds: string[];
  rules: AtomicRule[];
  testCorpusHash: string;
  reviewerSignoffs: SignoffRef[];
};

type AtomicRule = {
  ruleId: string;
  factPaths: string[];
  operator: string;
  parameter: unknown;
  applicability: PredicateTree;
  onPass: "continue" | "criteria_indicated";
  onFail: "criteria_not_indicated" | "verification_required";
  sourceClaimIds: string[];
  explanationTemplateId: string;
};
```

Every evaluation stores the bundle ID, input snapshot hash, evaluated rule IDs, evidence links,
outcomes and explanation-template versions. Corrections append records; they never overwrite the
original decision.

## Release acceptance

Neither pack may move beyond private evaluation until:

1. All atomic rules link to captured primary sources and supersession decisions.
2. A second internal reviewer reconciles guidance to controlling law.
3. A qualified German/Dutch reviewer signs the exact bundle and benchmark hash.
4. All critical fail, ambiguity, stale-source and boundary cases pass.
5. Replay reproduces the original outcome; current replay explains changed rules.
6. The UI never converts `criteria_indicated` into “eligible,” “approved” or “guaranteed.”
7. Monitoring can retire a changed bundle before unsupported positive conclusions are served.

## Sources

[^1]: Germany, Federal Ministry of Justice/Federal Office of Justice, [Residence Act, §18g](https://www.gesetze-im-internet.de/aufenthg_2004/BJNR195010004.html), current consolidated text accessed 10 September 2026.

[^2]: Federal Government of Germany, [EU Blue Card](https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card), 2026 values, accessed 10 September 2026.

[^3]: Federal Government of Germany, [Evaluation of foreign academic degrees](https://www.make-it-in-germany.com/en/working-in-germany/recognition/foreign-academic-qualifications), accessed 10 September 2026.

[^4]: Federal Government of Germany, [Visa options for IT professionals from third countries](https://www.make-it-in-germany.com/fileadmin/1_Rebrush_2022/a_Fachkraefte/PDF-Dateien/3_Visum_u_Aufenthalt/Visagrafik_EN/Visaoptionen_IT_aus_Drittstaaten_EN.pdf), January 2026.

[^5]: Netherlands Immigration and Naturalisation Service (IND), [Highly skilled migrant](https://ind.nl/en/residence-permits/work/highly-skilled-migrant), updated 18 August 2026.

[^6]: IND, [Public register Work](https://ind.nl/en/public-register-recognised-sponsors/public-register-work), updated 3 September 2026; IND states monthly update cadence.

[^7]: IND, [Required amounts income requirements](https://ind.nl/en/required-amounts-income-requirements), 2026 table and inclusion rules, accessed 10 September 2026.

[^8]: IND, [National highly skilled migrant scheme](https://ind.nl/en/about-us/background-articles/national-highly-skilled-migrant-scheme), accessed 10 September 2026.

[^9]: IND, [European Blue Card residence permit](https://ind.nl/en/residence-permits/work/european-blue-card-residence-permit), updated 15 June 2026.
