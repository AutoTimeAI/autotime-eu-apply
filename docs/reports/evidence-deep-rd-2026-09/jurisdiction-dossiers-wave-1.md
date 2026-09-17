# Jurisdiction dossiers — Wave 1

**Audit date:** 11 September 2026  
**Scope:** Germany, Netherlands, Ireland and Sweden.  
**Method:** separate controlling law, administrative interpretation, mutable dependency, executable predicates, unresolved questions and safe output.

## Germany — EU Blue Card

### Source chain

1. **Law:** Residence Act §18g defines qualifications, statutory percentage formulas, IT experience alternative, minimum six-month offer and annual publication duty.
2. **Administration:** Make it in Germany publishes the operational 2026 amounts: EUR 50,700 standard and EUR 45,934.20 for shortage occupations/new entrants and the IT experience pathway.
3. **Mutable dependencies:** annual pension-insurance contribution ceiling and annual federal minimum-salary notice; ISCO occupation mapping.

### Executable predicates

- Route is EU Blue Card; candidate is within a covered population.
- Concrete offer duration is at least six months.
- Job is appropriate to the qualifying education, or the IT alternative is evaluated.
- Standard branch: salary meets current annual value.
- Reduced branch: qualifying ISCO group or qualifying recent graduation, salary meets reduced value, and Federal Employment Agency consent where required.
- IT alternative: ISCO 133/25, three relevant years in prior seven, degree-comparable level, skills necessary for offered work.

### Residual risk and safe output

Occupation mapping and degree/experience comparability remain interpretive. Product output may say `potential_match` with evidence and authority caveat; never “visa approved” or “eligible with certainty.”

## Netherlands — Highly Skilled Migrant and EU Blue Card

### Source chain

1. **Law/instrument dependency:** annual amounts are published through the responsible ministerial/government-gazette process; the underlying instrument identifier remains to be captured in Phase 2.
2. **Administration:** IND route guidance requires an employment contract, a recognised sponsor for HSM, sufficient salary and market-rate pay.
3. **Mutable dependencies:** 2026 salary table, recognised-sponsor register, candidate age/graduate status, application date or new-employment start date, compensation composition.

### Executable predicates

- HSM employer must exactly resolve to a currently recognised legal entity; Blue Card sponsor requirements must remain route-specific.
- Choose EUR 5,942 (30+/Blue Card), EUR 4,357 (HSM under 30), EUR 3,122 (reduced HSM) or EUR 4,754 (reduced Blue Card) only after route and candidate facts are established.
- Count only documented fixed components paid monthly; exclude holiday allowance, in-kind and uncertain/non-regular elements.
- Independently test market-rate pay. Crossing the numeric threshold alone is insufficient.

### Residual risk and safe output

Entity ambiguity, market-rate interpretation and salary-component evidence force `employer_unverified` or `insufficient_evidence`. Sponsor recognition does not prove willingness to sponsor this vacancy.

## Ireland — Critical Skills Employment Permit

### Source chain

1. **Law:** Employment Permits Act 2024 authorises permit regulations and requires annual remuneration review against CSO earnings.
2. **Baseline regulation:** S.I. 444/2024 defines occupation schedules, qualifications, a two-year minimum employment period and minimum weekly hours.
3. **Current amendments:** S.I. 643/2025 commenced remuneration changes on 1 March 2026. It sets EUR 40,904 for standard listed-occupation branches, EUR 36,848 for qualifying recent graduates and EUR 68,911 for the high-pay branch. S.I. 213/2026 separately replaces occupation and ineligible schedules from 13 May 2026; it is not the salary instrument.
4. **Administration:** DETE's CSEP page aligns with S.I. 643/2025, while its remuneration table remains inconsistent at EUR 40,909/EUR 36,849.

### Residual risk and safe output

The controlling instrument resolves the decision values at EUR 40,904/EUR 36,848; the table discrepancy remains a first-class source-quality incident, not a rounding convention. Product decisions may use the statutory figures while disclosing the inconsistent summary and monitoring it for correction. The rules bundle must independently version the 1 March remuneration cohort and 13 May occupation-list cohort.

## Sweden — EU Blue Card

### Source chain

1. **Law:** Chapter 6a of the consolidated Aliens Act (2005:716), as amended by Law 2024:1220, requires highly qualified employment, a contract of at least six months and pay at least 1.25 times Swedish average gross annual salary. The consolidated text also encodes refusal, withdrawal, unemployment and change-notification conditions. The Aliens Ordinance ties the ICT experience branch to SSYK group 131 or major group 25 and three relevant years in the preceding seven.
2. **Administration:** Swedish Migration Agency requires higher education equivalent to 180 credits or five years relevant experience, a signed highly qualified contract of at least six months, insurance, and sufficient salary.
3. **Mutable dependency:** the agency sets an annual threshold equal to 1.25 times average gross salary published by the National Mediation Office. SEK 53,625 applies from 15 July 2026.

### Residual risk and safe output

The effective date is essential: a decision before 15 July needs the predecessor amount. Education equivalence, experience relevance, insurance period and highly-qualified-employment classification remain evidence predicates. The law-plus-administration chain supports deterministic threshold and duration checks, but the product must still return `potential_match` where qualification or job classification depends on evidence or authority judgment.
