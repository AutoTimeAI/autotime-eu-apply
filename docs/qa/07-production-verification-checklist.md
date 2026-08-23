# Production Verification Checklist

Every item this assessment could NOT verify against real production,
and exactly what's needed to close each one. This is the operational
punch-list behind the BLOCKED gates in `01-gap-analysis.md`.

| # | Item | How to verify | Status |
|---|---|---|---|
| 1 | Deployed SHA matches tested SHA (`130ca9ae5f9038e4eece27ad9a3eb549af431a3a`) | Vercel dashboard deployment detail, or `vercel inspect`, or a version marker added to a health endpoint | BLOCKED |
| 2 | All 40 Supabase migrations applied to production | Supabase dashboard migration history, or the verification queries in `docs/database/migration-register.csv` | BLOCKED |
| 3 | Production Supabase project is genuinely separate from dev (`autotime-prod` vs `autotime-dev`) | Compare `NEXT_PUBLIC_SUPABASE_URL` values across environments | BLOCKED |
| 4 | Stripe live keys (not test keys) configured in production, if paid beta enabled | Vercel env var inspection (presence/format only, never the value) | BLOCKED |
| 5 | `QA_SESSION_BOOTSTRAP_SECRET` / `QA_TEST_ACCOUNT_USER_ID` configured, enabling this assessment's own production-safe smoke suite | Supply the resulting `QA_SESSION_URL` to unblock `tests/e2e/production/` (9 specs) and `scripts/lighthouse-dashboard.mjs` | BLOCKED — highest-value item to close, unlocks the most additional evidence per unit of founder effort |
| 6 | Sentry DSN configured and receiving events in production | Sentry dashboard — confirm recent events exist | BLOCKED |
| 7 | Checkly checks deployed and passing | Checkly dashboard | BLOCKED |
| 8 | Automated Supabase backups enabled and recent | Supabase dashboard backup settings | BLOCKED |
| 9 | A restore has been demonstrated (any environment) | Restore a backup into a disposable project, verify data integrity | BLOCKED |
| 10 | A Vercel deployment rollback has been demonstrated | Roll back one deployment, verify the app serves the prior version | BLOCKED |
| 11 | GitHub secret scanning is enabled on the repository | Repo Settings → Code security → Secret scanning | Not verifiable by this assessment (no repo-admin settings access) |
| 12 | Production `/api/diagnostics/health` (or equivalent) is reachable and meaningful for future SHA verification | Confirm what auth it requires and document it | BLOCKED — this assessment's own read-only attempt returned no usable data |

## What was verified read-only, safely, this pass

- `NEXT_PUBLIC_APP_URL` presence and format in the repo's own
  `.env.production.example` template (a public value, not a secret) — matches the real production domain.
- The production URL itself responds (200 OK) to a plain GET on `/` (implicit from the ZAP baseline scan's own successful crawl).
- `robots.txt`, `/terms`, `/compatibility` and other public routes are reachable per the ZAP baseline log.

## Recommended order for the founder to close these

1. **#5** (QA session secrets) — unlocks the largest amount of additional automated evidence (9 production Playwright specs + dashboard Lighthouse) for the least effort.
2. **#1** (deployed SHA) — closes the single mandatory release gate that everything else in this report depends on being meaningful.
3. **#2, #3** (migrations, project separation) — closes the data-integrity gates.
4. **#8, #9, #10** (backup/restore/rollback) — closes the operational-safety gates; can be done in parallel with the above using a disposable project, doesn't require touching real production.
5. **#4, #6, #7** — closes remaining monitoring/payment configuration gates.
6. **#11, #12** — lower priority, process hygiene.
