# Test Execution Report

Summarises what was actually executed this pass, against
`test-cases.csv`/`test-cases.json` (95 cases). Full per-case detail
lives in those files; this report is the narrative summary.

## Execution totals

| Status | Count |
|---|---|
| PASS | 41 |
| FAIL | 2 |
| BLOCKED / NOT RUN | 51 |
| NOT APPLICABLE | 1 |
| **Total** | **95** |

## By test-ID prefix

| Prefix | Total | PASS | FAIL | NOT RUN | NOT APPLICABLE |
|---|---|---|---|---|---|
| AUTH | 10 | 3 | 0 | 7 | 0 |
| RLS | 10 | 6 | 0 | 4 | 0 |
| ADMIN | 7 | 5 | 0 | 2 | 0 |
| AI | 12 | 7 | 0 | 5 | 0 |
| PAY | 8 | 1 | 0 | 6 | 1 |
| PRIV | 6 | 2 | 0 | 4 | 0 |
| ING | 8 | 5 | 0 | 3 | 0 |
| EXT | 7 | 3 | 0 | 4 | 0 |
| SEC | 11 | 8 | 1 | 2 | 0 |
| A11Y | 4 | 1 | 0 | 3 | 0 |
| PERF | 3 | 0 | 1 | 2 | 0 |
| REC | 3 | 0 | 0 | 3 | 0 |
| MON | 3 | 1 | 0 | 2 | 0 |
| UAT | 3 | 1 | 0 | 2 | 0 |

## What genuinely passed this pass (real evidence, not assumed)

- **Full authentication route sweep** (SEC-011): all 53 API routes reviewed, zero gaps.
- **Stored-XSS review** (SEC-002): confirmed no unsafe rendering path exists for externally-sourced content.
- **Full local unit/integration/API suite** (39 files, `pnpm test:unit`): `fail 0` on every sub-suite.
- **Local core-journey E2E smoke** (`pnpm test:e2e:core`): 4/4.
- **10 of 11 axe-accessibility-wired specs**: passed clean (the 11th had unrelated environment-caused failures in the same file, not axe failures).
- **CodeQL, dependency-review**: both green at HEAD, retrieved from real CI history, not re-run speculatively.
- **ZAP passive baseline**: 0 FAIL-NEW, 60 PASS, 10 WARN-NEW (9 pre-existing accepted, 1 new and unconfirmed).

## What genuinely failed this pass (real findings, not softened)

- **SEC-010 / CodeQL**: one open alert (`js/incomplete-multi-character-sanitization`, `docx-cv.ts`) — see `SEC-FIND-001`. Verified not currently exploitable, but real and open.
- **PERF-002**: authenticated dashboard Lighthouse performance score 0.37–0.38 against a 0.6 budget, for 2 consecutive scheduled production runs — see `DEF-003`. This is the most consequential single finding from this pass: a real, reproducible, user-facing regression, discovered by retrieving actual CI history rather than trusting a green badge.

## What could not be run, and precisely why

| Category | Cases | Reason |
|---|---|---|
| Requires production/staging DB access | RLS-006, RLS-009, REC-001, REC-002, REC-003 | No Supabase dashboard/connection access from this assessment (G-04, G-06) |
| Requires production dashboard access (Checkly/Sentry) | MON-002, MON-003 | No dashboard access |
| Requires local Supabase config this sandbox lacks | 8 local Playwright specs (see `DEF-001`) | `.env.local` has no Supabase credentials configured in this environment |
| Requires local Lighthouse tooling that crashed | PERF-001 | Windows EPERM cleanup bug (`DEF-002`); scheduled Linux CI is the real source of truth and its public-pages job is confirmed green |
| Requires new test authorship not yet done | AUTH-006/008/009/010, RLS-004/010, ADMIN-006(partially confirmed)/007, AI-003/004/007/008/012, PAY-001–006, PRIV-002/004/005/006, ING-002/006/007/008, EXT-003/004/005/006, SEC-001/006/008, A11Y-002/003/004, UAT-002/003 | Real, specific test cases exist in the catalogue with concrete expected results; not yet executed given the scope and time of this pass |
| Requires founder authorisation | PAY-008 | Will not trigger a real charge without explicit go-ahead |

None of the above were silently dropped or assumed passing — every one has a concrete row in `test-cases.csv` with its specific blocking reason in the `Notes` column.

## Non-inflation statement

This is a partial execution pass, not a completed one. 51 of 95
catalogued cases remain genuinely unexecuted. The release decision in
`09-release-readiness-report.md` reflects this honestly.
