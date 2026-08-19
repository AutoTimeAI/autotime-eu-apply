param([Parameter(Mandatory = $true)][string]$ProjectRef)

$ErrorActionPreference = "Stop"

Write-Host "Deploying job-ingestion Edge Functions to Supabase project $ProjectRef"
supabase functions deploy sync-eures --project-ref $ProjectRef --no-verify-jwt
supabase functions deploy sync-job-sources --project-ref $ProjectRef --no-verify-jwt
supabase functions deploy sync-job-alerts --project-ref $ProjectRef --no-verify-jwt
Write-Host "Functions deployed. Apply supabase/cron/job-ingestion.sql only after creating the documented Vault secrets."
