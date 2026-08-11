# Production job-ingestion deployment

Status: ready to deploy, pending human confirmation of production accounts and secrets. Do not deploy until the checklist is complete.

## Required Supabase Edge Function secrets

- [ ] `SUPABASE_URL` — normally injected automatically by Supabase.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — normally injected automatically; required for service-owned listing upserts.
- [ ] `CRON_SECRET` — a new long random value shared only with the scheduler.
- [ ] `ADZUNA_APP_ID` — required only to enable Adzuna; obtain from the licensed account.
- [ ] `ADZUNA_APP_KEY` — required only to enable Adzuna.
- [ ] `JOOBLE_API_KEY` — required only to enable Jooble; obtain from the licensed account.
- [ ] `JOB_SYNC_QUERIES` — optional comma-separated search terms.
- [ ] `JOB_SYNC_COUNTRIES` — optional comma-separated Adzuna country codes.
- [ ] `JOB_SYNC_JOOBLE_LOCATION` — optional Jooble search location.

No Apollo secret is required because Path B (manual recruiter entry) was selected. The repository and inspected sibling workspaces contained no Apollo client or recruiter-cache table to port.

## Commands for the human operator

From the repository root, authenticate and link the intended production project, then set secrets without committing their values:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set CRON_SECRET="YOUR_LONG_RANDOM_VALUE" ADZUNA_APP_ID="..." ADZUNA_APP_KEY="..." JOOBLE_API_KEY="..." JOB_SYNC_QUERIES="software engineer,data engineer" JOB_SYNC_COUNTRIES="gb,ie,de,nl,fr" JOB_SYNC_JOOBLE_LOCATION="European Union" --project-ref YOUR_PROJECT_REF
supabase db push --linked
powershell -ExecutionPolicy Bypass -File scripts/deploy-job-ingestion.ps1 -ProjectRef YOUR_PROJECT_REF
```

Omit Adzuna or Jooble values if that provider account is not approved. The function reports the provider as `disabled_missing_credentials` and continues syncing EURES/direct ATS sources.

Finally, replace placeholders and run [job-ingestion.sql](../supabase/cron/job-ingestion.sql) in the production SQL editor. The daily schedules are 03:17 UTC for EURES and 03:47 UTC for direct ATS/aggregators. This matches the specification’s conservative once-daily polling requirement.

The checked-in GitHub Actions schedule is an alternative to `pg_cron`; enable only one scheduler to avoid duplicate requests. Database uniqueness still makes accidental overlap idempotent.

## Configure direct ATS companies

`sync-job-sources` reads its Greenhouse, Lever, Ashby and Personio targets from `company_ats_slugs`. Prepare a reviewed JSON file using [the starter example](../supabase/seeds/company-ats-slugs.example.json), then run:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
node scripts/seed-ats-slugs.mjs supabase/seeds/company-ats-slugs.example.json
```

The script validates every row and upserts on `company_name,ats_platform`, so it is safe to rerun. Keep the service-role key out of files and shell history. The included companies came from previously recorded live ATS validation URLs; confirm they still use those boards before production seeding.

- Greenhouse: for `boards.greenhouse.io/acme` or `job-boards.greenhouse.io/acme`, use `acme`.
- Lever: for `jobs.lever.co/Acme`, use the case-sensitive `Acme` segment.
- Ashby: for `jobs.ashbyhq.com/acme`, use `acme`.
- Personio: for `acme.jobs.personio.de`, use the `acme` subdomain. The scheduled function currently targets the `.de` XML feed.

To add or correct a company, edit a private copy of the JSON array and rerun the script. Do not guess slugs: first verify the published ATS board URL manually.
