$ErrorActionPreference = "Continue"
$passed = 0
$failed = 0

function Confirm-Path([string]$Description, [string]$Path) {
  if (Test-Path -LiteralPath $Path) { Write-Host "  [PASS] $Description ($Path)"; $script:passed++ }
  else { Write-Host "  [FAIL] $Description - missing $Path"; $script:failed++ }
}

function Confirm-Text([string]$Description, [string]$Pattern, [string]$Path) {
  if (Select-String -LiteralPath $Path -Pattern $Pattern -Quiet) { Write-Host "  [PASS] $Description"; $script:passed++ }
  else { Write-Host "  [FAIL] $Description"; $script:failed++ }
}

function Invoke-Gate([string]$Description, [scriptblock]$Command) {
  Write-Host "  Running $Description..."
  & $Command
  if ($LASTEXITCODE -eq 0) { Write-Host "  [PASS] $Description"; $script:passed++ }
  else { Write-Host "  [FAIL] $Description"; $script:failed++ }
}

Write-Host "=== Phase implementation files ==="
Confirm-Path "Shared ATS detector" "packages/shared/src/ats-detector.ts"
Confirm-Text "ATS detector export" "export function detectATS" "packages/shared/src/ats-detector.ts"
Confirm-Path "EURES edge function" "supabase/functions/sync-eures/index.ts"
Confirm-Path "Job-source edge function" "supabase/functions/sync-job-sources/index.ts"
Confirm-Path "ATS slug seed utility" "scripts/seed-ats-slugs.mjs"
Confirm-Path "ATS slug starter data" "supabase/seeds/company-ats-slugs.example.json"
foreach ($adapter in @("greenhouse", "lever", "ashby", "personio")) { Confirm-Path "$adapter adapter" "apps/web/lib/ats-feeds/$adapter.ts" }
Confirm-Path "Deduplication module" "apps/web/lib/dedup.ts"
Confirm-Path "Adzuna adapter" "apps/web/lib/aggregators/adzuna.ts"
Confirm-Path "Jooble adapter" "apps/web/lib/aggregators/jooble.ts"
Confirm-Path "Aggregated jobs browser" "apps/web/app/dashboard/jobs/browse/page.tsx"
Confirm-Path "CV schema" "apps/web/lib/cv/types.ts"
Confirm-Path "CV renderer" "apps/web/components/cv/CVRenderer.tsx"
Confirm-Path "CV tailoring API" "apps/web/app/api/ai/tailor-cv/route.ts"
Confirm-Text "CV tailoring server function" "tailorCvWithOpenAI" "apps/web/lib/openai-server.ts"
Confirm-Path "CV workspace" "apps/web/components/cv/CVWorkspace.tsx"
Confirm-Path "Outreach drafter" "apps/web/lib/outreach-drafter.ts"
Confirm-Text "Peer contact type" "peer_target_role" "apps/web/lib/outreach-drafter.ts"
Confirm-Path "ESCO classifier" "apps/web/lib/esco/classify-job.ts"
Confirm-Path "ESCO questionnaire API" "apps/web/app/api/esco/questionnaire/route.ts"
Confirm-Path "Overlap-only ESCO correction" "supabase/migrations/20260811120000_defer_esco_vector_matching.sql"
Confirm-Path "Feature audit" "docs/autotime-feature-spec-audit.md"
Confirm-Path "Compliance policy" "docs/job-aggregation-compliance.md"
Confirm-Path "Ingestion deployment guide" "docs/job-ingestion-deployment.md"
Confirm-Path "Cron SQL" "supabase/cron/job-ingestion.sql"
Confirm-Path "Deployment helper" "scripts/deploy-job-ingestion.ps1"

Write-Host "=== Automated gates ==="
Invoke-Gate "web typecheck" { pnpm.cmd --filter web typecheck }
Invoke-Gate "feature-focused tests" { node --test --experimental-strip-types scripts/job-aggregation.test.mjs }
Invoke-Gate "repository unit suite" { pnpm.cmd test:unit }
Invoke-Gate "production web build" { pnpm.cmd build:web }

Write-Host "PASS: $passed  FAIL: $failed"
Write-Host "See docs/verify-feature-implementation.md for manual and live checks."
if ($failed -gt 0) { exit 1 }
