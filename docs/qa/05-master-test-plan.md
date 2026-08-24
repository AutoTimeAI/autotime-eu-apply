# Master private-beta test plan

## Objective

Demonstrate that the frozen AutoTime AI candidate is safe enough for a controlled private beta using reproducible evidence across browser, API, database, extension, operations and security boundaries.

## Environments

- `local-offline`: no real credentials, payments, emails or AI charges.
- `local-db` or `test`: isolated Supabase project with two synthetic users and test-mode integrations.
- `production-safe`: read-only configuration checks and non-mutating smoke only after founder approval.

## Result rules

Use only PASS, FAIL, BLOCKED, NOT RUN and NOT APPLICABLE. PASS requires an indexed artifact containing test ID, environment, UTC timestamp, branch and exact tested SHA. Screenshots alone cannot prove backend authorization, isolation, concurrency or idempotency. Missing prerequisites are BLOCKED; unexecuted definitions are NOT RUN.

## Execution order

1. Freeze candidate and create evidence directory.
2. Clean frozen dependency installation and audit.
3. Format, lint, typecheck, unit/security/static tests and builds.
4. Core E2E, accessibility and approved visual regression.
5. Isolated database/API scenarios and founder-led OWASP assessment.
6. Configuration, migration and operational exercises.
7. Approved production deployment and safe smoke; compare SHAs.
8. Hash and validate evidence, then calculate gates and recommendation.

Destructive production actions, real charges, real email, production migrations, account deletion, restoration and rollback require an explicit founder confirmation immediately before execution.
