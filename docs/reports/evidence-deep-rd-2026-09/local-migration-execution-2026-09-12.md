# Local mobility migration execution — 12 September 2026

## Result

The complete repository migration chain was applied successfully from an empty isolated local Supabase database with `supabase db reset`. No staging or production database was accessed.

## Defect discovered and resolved

The first reset stopped at `20260815150000_schedule_job_sync.sql` because the repository had no local Vault values for `job_sync_function_base_url` and `job_sync_cron_secret`. Local-only non-production placeholders were added in `supabase/roles.sql`, which Supabase loads before migrations. The second reset applied every migration through `20260912160000_mobility_learning_experiments.sql` successfully.

## Post-apply evidence

| Check | Result |
|---|---:|
| New mobility moat tables | 30 |
| New mobility moat tables with RLS | 30 |
| Browser-role grants on new moat tables | 0 |
| Moat migrations recorded | 5 |
| Required mobility functions present | 4 |
| Tables with immutable/no-update triggers | 28 |

The remaining two tables are the intentionally stateful correction and replay workflow tables. They have RLS and no browser-role grants but permit trusted server-side workflow transitions.

## Boundary

This earns local executable-migration evidence only. It does not prove production deployment, seeded Germany/Netherlands rule bundles, real expert sign-off, source monitoring, provider delivery or user value. Production governance enforcement must remain disabled until the read-only preflight is run against the intended environment and its DE/NL readiness records are reviewed.
