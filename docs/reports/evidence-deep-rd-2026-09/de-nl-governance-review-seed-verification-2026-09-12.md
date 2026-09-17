# Germany and Netherlands governance review seed verification

Date: 2026-09-12

## Status

The DE/NL mobility evidence review seed executed successfully against the isolated local Supabase database after the complete migration chain. It is deliberately **non-production**, **information-only**, and **not expert approved**.

This verifies that research identifiers can be carried through the implemented provenance model. It does not validate the legal correctness, freshness, or completeness of the underlying mobility claims.

## Executed fixture

- Seed: `supabase/seeds/mobility_de_nl_review_seed.sql`
- Safety contract test: `scripts/mobility-review-seed.test.mjs`
- Countries: Germany and Netherlands
- Rules remain in `review_required` state.
- Readiness remains `information_only` with score 35.
- Source snapshot URIs explicitly use `local-seed://not-a-source-capture/...`.
- No expert sign-off or rule activation is created.

## Database results

| Governed object | Rows |
| --- | ---: |
| Source documents | 5 |
| Source versions | 5 |
| Source spans | 6 |
| Claims | 6 |
| Claim versions | 6 |
| Rule bundles | 2 |
| Rule bundle versions | 2 |
| Rule-to-claim links | 6 |
| Country readiness snapshots | 2 |
| Expert sign-offs | 0 |
| Rule activations | 0 |

Both readiness snapshots reported `information_only` and the reason codes `NON_PRODUCTION_REVIEW_SEED`, `SOURCE_CAPTURE_REQUIRED`, and `EXPERT_SIGNOFF_ABSENT`.

## Immutability result

An attempted update of the seeded Germany claim version was rejected by the database with:

> immutable mobility evidence rows cannot be updated or deleted

The failed statement did not persist any mutation.

## What remains before production use

1. Capture and hash the actual source content rather than placeholder review text.
2. Reconcile each claim against the effective-dated primary source and record precise locators.
3. Execute and retain the named boundary/negative evaluation cases.
4. Obtain jurisdiction-qualified expert review and an attributable, scoped sign-off.
5. Promote only a signed rule version through the activation workflow.

Production systems and production data were not touched during this verification.
