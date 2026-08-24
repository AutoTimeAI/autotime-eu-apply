# Deploys the job-ingestion Supabase Edge Functions (sync-eures,
# sync-job-sources, sync-job-alerts) to a target Supabase project. Run
# manually as part of job ingestion setup/redeploys, e.g.
# `powershell -File scripts/deploy-job-ingestion.ps1 -ProjectRef <ref>`.
#
# Requires the Supabase CLI (`supabase`) authenticated and on PATH. Side
# effect: deploys three edge functions with `--no-verify-jwt` to the given
# project. Deploying functions does not apply the cron schedule — the
# printed reminder is to run `supabase/cron/job-ingestion.sql` separately,
# and only after the required Vault secrets have been created.
param([Parameter(Mandatory = $true)][string]$ProjectRef)

$ErrorActionPreference = "Stop"

Write-Host "Deploying job-ingestion Edge Functions to Supabase project $ProjectRef"
supabase functions deploy sync-eures --project-ref $ProjectRef --no-verify-jwt
supabase functions deploy sync-job-sources --project-ref $ProjectRef --no-verify-jwt
supabase functions deploy sync-job-alerts --project-ref $ProjectRef --no-verify-jwt
Write-Host "Functions deployed. Apply supabase/cron/job-ingestion.sql only after creating the documented Vault secrets."
