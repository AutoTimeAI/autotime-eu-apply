#!/usr/bin/env bash
# Repository-only verification for feature-spec phases 1-11.
# Live APIs, credentials, deployed migrations, and browser checks remain manual.
set -uo pipefail

PASS=0
FAIL=0

check_file() {
  local description="$1" path="$2"
  if [[ -e "$path" ]]; then
    printf '  [PASS] %s (%s)\n' "$description" "$path"
    PASS=$((PASS + 1))
  else
    printf '  [FAIL] %s — missing %s\n' "$description" "$path"
    FAIL=$((FAIL + 1))
  fi
}

check_text() {
  local description="$1" pattern="$2" path="$3"
  if grep -Eq "$pattern" "$path"; then
    printf '  [PASS] %s\n' "$description"
    PASS=$((PASS + 1))
  else
    printf '  [FAIL] %s\n' "$description"
    FAIL=$((FAIL + 1))
  fi
}

echo '=== Phase implementation files ==='
check_file 'Shared ATS detector' packages/shared/src/ats-detector.ts
check_text 'ATS detector export' 'export function detectATS' packages/shared/src/ats-detector.ts
check_file 'EURES edge function' supabase/functions/sync-eures/index.ts
check_file 'Job-source edge function' supabase/functions/sync-job-sources/index.ts
check_file 'ATS slug seed utility' scripts/seed-ats-slugs.mjs
check_file 'ATS slug starter data' supabase/seeds/company-ats-slugs.example.json
for adapter in greenhouse lever ashby personio; do
  check_file "${adapter} adapter" "apps/web/lib/ats-feeds/${adapter}.ts"
done
check_file 'Deduplication module' apps/web/lib/dedup.ts
check_file 'Adzuna adapter' apps/web/lib/aggregators/adzuna.ts
check_file 'Jooble adapter' apps/web/lib/aggregators/jooble.ts
check_file 'Aggregated jobs browser' apps/web/app/dashboard/jobs/browse/page.tsx
check_file 'CV schema' apps/web/lib/cv/types.ts
check_file 'CV renderer' apps/web/components/cv/CVRenderer.tsx
check_file 'CV tailoring API' apps/web/app/api/ai/tailor-cv/route.ts
check_text 'CV tailoring server function' 'tailorCvWithOpenAI' apps/web/lib/openai-server.ts
check_file 'CV workspace' apps/web/components/cv/CVWorkspace.tsx
check_file 'Cover-letter API' apps/web/app/api/ai/cover-letter/route.ts
check_file 'Cover-letter version migration' supabase/migrations/20260815120000_cover_letter_versions.sql
check_file 'Outreach drafter' apps/web/lib/outreach-drafter.ts
check_text 'Peer contact type' 'peer_target_role' apps/web/lib/outreach-drafter.ts
check_file 'ESCO classifier' apps/web/lib/esco/classify-job.ts
check_file 'ESCO questionnaire API' apps/web/app/api/esco/questionnaire/route.ts
check_file 'ESCO single-job score API' apps/web/app/api/esco/score-job/route.ts
check_file 'Extension ESCO overlay' apps/extension/lib/match-overlay.ts
check_file 'Overlap-only ESCO correction' supabase/migrations/20260811120000_defer_esco_vector_matching.sql
check_file 'Feature audit' docs/reference/autotime-feature-spec-audit.md
check_file 'Compliance policy' docs/reference/job-aggregation-compliance.md
check_file 'Ingestion deployment guide' docs/reference/job-ingestion-deployment.md
check_file 'Cron SQL' supabase/cron/job-ingestion.sql
check_file 'Deployment helper' scripts/deploy-job-ingestion.ps1

run_gate() {
  local description="$1" command="$2"
  echo "  Running ${description}..."
  if eval "$command"; then
    printf '  [PASS] %s\n' "$description"
    PASS=$((PASS + 1))
  else
    printf '  [FAIL] %s\n' "$description"
    FAIL=$((FAIL + 1))
  fi
}

echo '=== Automated gates ==='
run_gate 'web typecheck' 'pnpm --filter web typecheck'
run_gate 'feature-focused tests' 'node --test --experimental-strip-types scripts/job-aggregation.test.mjs'
run_gate 'repository unit suite' 'pnpm test:unit'
run_gate 'production extension build' 'pnpm --filter extension build'
run_gate 'production web build' 'pnpm build:web'

echo "PASS: ${PASS}  FAIL: ${FAIL}"
echo 'See docs/reference/verify-feature-implementation.md for manual and live checks.'
[[ "$FAIL" -eq 0 ]]
