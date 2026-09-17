# Core foundation execution

**Governing direction:** `AutoTime-EU-Apply-Core-Product-Investment-Strategy.pdf`  
**Source version:** `docs/product-core-investment-strategy.md`, approved 9 September 2026  
**Execution status:** Active

## Foundation boundary

Engineering investment is organized around one continuous role record:

`vacancy → decision → evidence review → application kit → approval → submission → interview → outcome`

EU Fit, evidence integrity, and application preparation are the product pillars. Profile,
capture, tracking, billing, analytics, administration, and observability remain supporting
capabilities. Work outside the three pillars must demonstrate a direct safety, reliability, or
core-loop outcome before receiving committed capacity.

## Executable foundation now in place

- Shared sponsorship-rejection policy across fit, mobility, and live Jobs decisions.
- Shared jurisdiction precedence: explicit choice, vacancy country, then profile preference.
- Cross-path decision tests for positive and negative sponsorship scenarios.
- `assessCoreLoopTrace` validates role/application/interview continuity without reading sensitive
  candidate or vacancy content.
- Core-loop validation rejects approval without a retained decision and evidence review.
- Core-loop validation rejects submission without explicit confirmation or an application date.
- Core-loop validation rejects interviews linked across application or role boundaries.
- The contract test is part of the main unit-test gate.

## Strategic engineering sequence

1. **EU Fit foundation:** normalize the two public decision result shapes; retain structured
   blockers, missing facts, evidence status, source freshness, and one categorical decision.
2. **Evidence foundation:** give generated material claims stable evidence-link identifiers and
   enforce the inferred-to-verified transition as an explicit user action.
3. **Preparation foundation:** persist kit-generation and approval metadata against the live
   application/role identity, including blockers and intentionally blank fields.
4. **Lifecycle enforcement:** invoke core-loop integrity checks at persistence and release
   boundaries, not only in tests.
5. **Outcome learning:** emit privacy-minimal stage transitions keyed by role/application ID so
   cohort outcomes can be measured without CV, vacancy, or generated-document content.

## Explicitly deferred

- New career-direction breadth.
- Standalone outreach automation.
- Voice/video interview scoring.
- More platform logos without reliability evidence.
- Complex pricing or customer-facing credit mechanics.
- Any claim that AutoTime increases interviews or hiring likelihood.

External evidence gates—qualified jurisdiction review, UAT, comprehension, trust, willingness to
pay, and outcome validation—remain human/product work and cannot be closed by this engineering
foundation alone.
