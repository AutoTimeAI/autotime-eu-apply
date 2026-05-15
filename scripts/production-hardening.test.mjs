import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const repoRoot = process.cwd()

function read(path) {
  return readFileSync(join(repoRoot, path), "utf8")
}

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("billing lock migration removes client-side subscription and usage writes", () => {
  const migration = read(
    "supabase/migrations/20260508100000_lock_billing_server_writes.sql"
  )

  assert.match(
    migration,
    /drop policy if exists "subscriptions_update_own" on public\.subscriptions;/i
  )
  assert.match(
    migration,
    /drop policy if exists "ai_usage_insert_own" on public\.ai_usage;/i
  )
})

test("Stripe webhook awaits server-side subscription processing", () => {
  const route = read("apps/web/app/api/stripe/webhook/route.ts")

  assert.match(route, /await handleStripeEvent\(event\)/)
  assert.doesNotMatch(route, /void handleStripeEvent\(event\)\.catch/)
})

test("environment templates keep development and production credentials separated", () => {
  const localTemplate = read(".env.local.example")
  const productionTemplate = read(".env.production.example")

  assert.match(localTemplate, /NEXT_PUBLIC_AUTOTIME_ENV=development/)
  assert.match(localTemplate, /pk_test_/)
  assert.match(localTemplate, /sk_test_/)
  assert.doesNotMatch(localTemplate, /pk_live_/)
  assert.doesNotMatch(localTemplate, /sk_live_/)

  assert.match(productionTemplate, /NEXT_PUBLIC_AUTOTIME_ENV=production/)
  assert.match(productionTemplate, /pk_live_/)
  assert.match(productionTemplate, /sk_live_/)
  assert.doesNotMatch(productionTemplate, /pk_test_/)
  assert.doesNotMatch(productionTemplate, /sk_test_/)
})

test("CI builds the web dashboard with non-production placeholder secrets", () => {
  const workflow = read(".github/workflows/unit-tests.yml")

  assert.match(workflow, /NEXT_PUBLIC_AUTOTIME_ENV: preview/)
  assert.match(workflow, /STRIPE_SECRET_KEY: sk_test_offline_ci/)
  assert.match(workflow, /NEXT_PUBLIC_SUPABASE_URL: https:\/\/example\.supabase\.co/)
})

test("AI rate-limit RPC uses timestamptz reset values", () => {
  const migration = read(
    "supabase/migrations/20260514120000_fix_ai_rate_limit_timestamp.sql"
  )

  assert.match(migration, /current_timestamp_at timestamptz := now\(\);/)
  assert.match(
    migration,
    /current_timestamp_at \+ make_interval\(secs => p_window_seconds\)/
  )
  assert.doesNotMatch(migration, /current_time timestamptz/)
})

test("profile sync stores one current profile record per user", () => {
  const migration = read("supabase/migrations/20260506171000_cloud_sync_profiles.sql")
  const cloudSync = read("apps/web/lib/cloud-sync.ts")

  assert.match(migration, /create table if not exists public\.profiles/i)
  assert.match(migration, /constraint profiles_user_unique unique \(user_id\)/i)
  assert.match(migration, /alter table public\.profiles enable row level security/i)
  assert.match(cloudSync, /\.upsert\(payloadResult\.payload, \{ onConflict: "user_id" \}\)/)
})

test("profile CV AI review validates input before quota checks", () => {
  const routes = [
    "apps/web/app/api/ai/analyse/route.ts",
    "apps/web/app/api/ai/content/route.ts",
    "apps/web/app/api/ai/interview/route.ts",
    "apps/web/app/api/ai/interview-answer/route.ts",
    "apps/web/app/api/ai/profile-context/route.ts"
  ]

  for (const routePath of routes) {
    const route = read(routePath)
    const parseIndex = route.indexOf("const body = requestSchema.parse")
    const rateLimitIndex = route.indexOf("await assertAiRouteRateLimit")
    const featureGateIndex = route.indexOf("await assertCanUseAi")

    assert.notEqual(parseIndex, -1, routePath)
    assert.notEqual(rateLimitIndex, -1, routePath)
    assert.notEqual(featureGateIndex, -1, routePath)
    assert.ok(parseIndex < rateLimitIndex, routePath)
    assert.ok(parseIndex < featureGateIndex, routePath)
  }
})

test("profile CV AI review handles upgrade limits before generic errors", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const upgradeIndex = dashboard.indexOf('body.data && "upgradeUrl" in body.data')
  const errorIndex = dashboard.indexOf("!response.ok || !body.data || body.error")

  assert.notEqual(upgradeIndex, -1)
  assert.notEqual(errorIndex, -1)
  assert.ok(upgradeIndex < errorIndex)
})

test("AI review schemas accept list fields as string or array", () => {
  const openaiServer = read("apps/web/lib/openai-server.ts")
  const interviewPrep = read("apps/web/lib/interview-prep.ts")
  const route = read("apps/web/app/api/ai/profile-context/route.ts")

  assert.match(
    openaiServer,
    /z\s*\.\s*union\(\[z\.string\(\), z\.array\(z\.string\(\)\)\]\)/
  )
  assert.match(openaiServer, /normaliseStringList/)
  assert.match(openaiServer, /renderTargetRoles\(value\.targetRoles\)/)
  assert.match(openaiServer, /scoreFactors: stringListSchema/)
  assert.match(openaiServer, /likelyQuestions: stringListSchema/)
  assert.match(openaiServer, /riskFlags: stringListSchema/)
  assert.match(interviewPrep, /typeof value !== "string"/)
  assert.match(route, /getValidationIssueMessage/)
  assert.match(read("apps/web/lib/diagnostics.ts"), /getValidationIssueMessage/)
})

test("CV profile detail extraction stays conservative", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(dashboard, /function inferCandidateDetailsFromResume/)
  assert.match(dashboard, /roleTitleKeywords/)
  assert.match(dashboard, /!includesAny\(line, roleTitleKeywords\)/)
  assert.match(dashboard, /currentCountry = locationLine/)
  assert.match(dashboard, /currentProfile\.fullName\.trim\(\)/)
  assert.match(dashboard, /inferredDetails\.fullName/)
  assert.match(dashboard, /canUseInferredCurrentCountry/)
  assert.doesNotMatch(dashboard, /gender|ethnicity|marital|nationality|dateOfBirth/i)
})

test("profile evidence sync stays local-first until online save succeeds", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(
    dashboard,
    /if \(storedSyncPreferences\.profileAccountSyncEnabled\) \{\s*void loadDashboardSnapshot\(\{ silent: true \}\)\s*void loadProfileSnapshot\(\{ silent: true \}\)\s*\}/
  )
  assert.match(
    dashboard,
    /if \(!syncPreferences\.profileAccountSyncEnabled\) \{\s*return\s*\}/
  )
  assert.match(dashboard, /const synced = await syncProfileStateToCloud\(state\.profile\)/)
  assert.match(dashboard, /if \(synced\) \{\s*setProfileAccountSyncEnabled\(true\)\s*\}/)
})

test("Proof Library stays a standalone reusable-proof workspace", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const userNav = read("apps/web/components/UserNav.tsx")
  const publicNav = read("apps/web/components/PublicNav.tsx")

  assert.match(userNav, /label: "Proof Library"/)
  assert.match(userNav, /description: "Reusable proof"/)
  assert.match(userNav, /before using \$\{workflowLabel\}/)
  assert.match(userNav, /before using \$\{item\.label\}/)
  assert.match(publicNav, /before using \$\{areaLabel\}/)
  assert.match(dashboard, /eyebrow: "Proof Library"/)
  assert.match(dashboard, /title: "Proof Library"/)
  assert.match(dashboard, /aria-label="Proof Library workspace"/)
  assert.match(dashboard, /Reusable proof, not another workflow/)
  assert.match(dashboard, /Proof Library only keeps reusable proof/)
  assert.match(dashboard, /Does not duplicate/)
  assert.match(dashboard, /Profile Evidence, Fit Analysis and\s*Application Kit/)
  assert.match(dashboard, /Proof Library is saved with your profile/)
  assert.match(dashboard, /state\.profile\.baseCvText/)
  assert.match(dashboard, /state\.profile\.experienceHighlights/)
  assert.match(dashboard, /state\.profile\.projectSummaries/)
  assert.match(dashboard, /state\.reusableAnswers\[key\]/)
  assert.match(dashboard, /Update source profile/)
  assert.match(dashboard, /Write from proof/)
  assert.doesNotMatch(dashboard, /Edit profile evidence/)
})

test("Analyse Fit pillar keeps 360 workflow wiring intact", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const fitModel = read("packages/shared/src/fit-model.ts")

  assert.match(dashboard, /title: "Analyse Fit before you apply"/)
  assert.match(
    dashboard,
    /Rules-first fit check for one role against your saved profile evidence/
  )
  assert.match(dashboard, /Use AI assistant/)
  assert.match(dashboard, /Open fit check/)
  assert.match(dashboard, /Strengthen the review/)
  assert.match(dashboard, /Rules first/)
  assert.match(dashboard, /AI strengthens the review, but evidence\s*controls the outcome/)
  assert.match(dashboard, /Official sources and saved proof outrank AI/)
  assert.match(dashboard, /Official source check needed/)
  assert.match(dashboard, /Official source reviewed/)
  assert.match(
    dashboard,
    /Official sources and employer wording must be\s*checked before relying on work-right, sponsorship,\s*relocation or location-fit advice\./
  )
  assert.match(
    dashboard,
    /AI output cannot override official sources, saved\s*profile evidence, parsed job text or your review\./
  )
  assert.match(dashboard, /setOfficialSourceReviewed\(event\.target\.checked\)/)

  const createApplicationStart = dashboard.indexOf("function createApplication(")
  const createContentStart = dashboard.indexOf(
    "function createApplicationContentSnapshot("
  )
  const saveStart = dashboard.indexOf("const saveApplicationFromJob = async () =>")
  const aiStart = dashboard.indexOf("const runAiJobAnalysis = async () =>")
  const updateStart = dashboard.indexOf("const updateApplication = (")

  assert.notEqual(createApplicationStart, -1)
  assert.notEqual(createContentStart, -1)
  assert.notEqual(aiStart, -1)
  assert.notEqual(saveStart, -1)
  assert.notEqual(updateStart, -1)

  const createApplicationFlow = dashboard.slice(
    createApplicationStart,
    createContentStart
  )
  const saveFlow = dashboard.slice(saveStart, aiStart)
  const aiFlow = dashboard.slice(aiStart, updateStart)

  assert.match(createApplicationFlow, /nextAction: fitEvaluation\.nextBestAction/)
  assert.match(createApplicationFlow, /fitScore: fitEvaluation\.overallScore/)
  assert.match(createApplicationFlow, /fitDecision: fitEvaluation\.decision/)
  assert.match(createApplicationFlow, /contentGate: fitEvaluation\.contentGate/)

  assert.match(aiFlow, /requireProfileExecutionReady\(\)/)
  assert.match(aiFlow, /hasJobDraft\(state\.jobAnalysis\)/)
  assert.match(aiFlow, /fetch\("\/api\/ai\/analyse"/)
  assert.match(aiFlow, /profile: state\.profile/)
  assert.match(aiFlow, /persist\(next, "AI fit assistant updated the role analysis"\)/)

  assert.match(saveFlow, /requireProfileExecutionReady\(\)/)
  assert.match(saveFlow, /hasJobDraft\(state\.jobAnalysis\)/)
  assert.match(saveFlow, /createApplication\(/)
  assert.match(saveFlow, /fitScore: fitEvaluation\.overallScore/)
  assert.match(saveFlow, /createEvidenceRecords\(/)
  assert.match(saveFlow, /createOutcomeRecord\(application\)/)
  assert.match(saveFlow, /syncDashboardStateToCloud\(nextState/)
  assert.match(saveFlow, /openDashboardView\("applications"\)/)

  assert.match(fitModel, /export function evaluateCountryFit/)
  assert.match(fitModel, /getSponsorshipLikelihood/)
  assert.match(fitModel, /getRightToWorkCompatibility/)
  assert.match(fitModel, /getCountryLocationFit/)
  assert.match(fitModel, /contentGate/)
})

test("Interview Prep keeps coaching, prep packs and reusable answers separated", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(dashboard, /title: "Interview Prep"/)
  assert.match(dashboard, /Prepare evidence-led interview answers and role prep packs/)
  assert.match(dashboard, /aria-label="Interview Prep workflow"/)
  assert.match(dashboard, /Choose the question/)
  assert.match(dashboard, /Add rough notes/)
  assert.match(dashboard, /Review the coach/)
  assert.match(dashboard, /Save reusable wording/)
  assert.match(dashboard, /aria-label="Interview Prep responsibility"/)
  assert.match(dashboard, /Does not duplicate/)
  assert.match(
    dashboard,
    /Profile Evidence, Fit Analysis, Proof\s*Library and Application Kit/
  )
  assert.match(dashboard, /Save to Proof Library/)
  assert.match(dashboard, /Saved prep packs from tracked jobs/)
  assert.match(dashboard, /const tokens = getMeaningfulTokens\(value\)/)
  assert.match(dashboard, /tokens\.some\(\(token\) => \/\(\.\)\\1\{3,\}\//)

  const prepStart = dashboard.indexOf("const generateInterviewPrep = async")
  const saveAnswerStart = dashboard.indexOf(
    "const saveFinalInterviewAnswer = () =>"
  )
  const speakStart = dashboard.indexOf("const speakInterviewAnswer = (")

  assert.notEqual(prepStart, -1)
  assert.notEqual(saveAnswerStart, -1)
  assert.notEqual(speakStart, -1)

  const prepFlow = dashboard.slice(prepStart, saveAnswerStart)
  const saveAnswerFlow = dashboard.slice(saveAnswerStart, speakStart)

  assert.match(prepFlow, /getInterviewPrepGuardrails\(/)
  assert.match(prepFlow, /createLocalInterviewPrepPack\(/)
  assert.match(prepFlow, /fetch\("\/api\/ai\/interview"/)
  assert.match(prepFlow, /saveInterviewPrepPack\(/)

  assert.match(saveAnswerFlow, /requireProfileExecutionReady\(\)/)
  assert.match(
    saveAnswerFlow,
    /\[finalAnswerStorageKey\]: interviewBuddyOutputs\.strongFinalAnswer/
  )
  assert.match(saveAnswerFlow, /persist\(/)
  assert.match(saveAnswerFlow, /scheduleDashboardSync\(next/)
})

test("Follow-ups and Progress stay ordered and do not duplicate tracker systems", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(dashboard, /title: "Follow-up Queue"/)
  assert.match(dashboard, /Work the next dated action across tracked jobs/)
  assert.match(dashboard, /function hasFollowUpAction\(application: ApplicationRecord\)/)
  assert.match(dashboard, /application\.nextActionDate/)
  assert.match(dashboard, /\["Applied", "Interview", "Offer"\]\.includes\(application\.status\)/)
  assert.match(dashboard, /aria-label="Follow-up workflow"/)
  assert.match(dashboard, /Only jobs with a date, action or in-flight status appear/)
  assert.match(dashboard, /aria-label="Follow-up responsibility"/)
  assert.match(dashboard, /Clear scheduled action/)

  assert.match(dashboard, /title: "Progress"/)
  assert.match(dashboard, /Progress reports what happened; it does not replace Fit Analysis/)
  assert.match(dashboard, /aria-label="Progress workflow"/)
  assert.match(dashboard, /Track outcomes/)
  assert.match(dashboard, /Run report/)
  assert.match(dashboard, /aria-label="Progress responsibility"/)
  assert.match(dashboard, /Fit Analysis scores roles, Follow-ups works actions/)
  assert.match(dashboard, /onClick=\{runOnlineAnalytics\}/)

  const updateStart = dashboard.indexOf("const updateApplication = (")
  const deleteStart = dashboard.indexOf("const removeApplicationFromState = (")
  assert.notEqual(updateStart, -1)
  assert.notEqual(deleteStart, -1)
  const updateFlow = dashboard.slice(updateStart, deleteStart)

  assert.match(updateFlow, /updateOutcomeRecordFromApplication\(/)
  assert.match(updateFlow, /persist\(nextState, "Application and outcome record updated"\)/)
  assert.match(updateFlow, /scheduleDashboardSync\(nextState/)
})

test("Public product promise matches the strategic European tech positioning", () => {
  const login = read("apps/web/components/LoginContent.tsx")
  const layout = read("apps/web/app/layout.tsx")
  const pricing = read("apps/web/app/pricing/page.tsx")
  const pricingCard = read("apps/web/components/PricingCard.tsx")
  const og = read("apps/web/app/api/og/route.tsx")

  assert.match(login, /Strategic European tech applications/)
  assert.match(login, /Better applications/)
  assert.match(login, /Stronger interviews/)
  assert.match(login, /Quality over quantity/)
  assert.match(login, /country,\s*work-right and market reality/)
  assert.match(login, /Interview conversion/)

  assert.match(layout, /Strategic European Tech Applications/)
  assert.match(layout, /strategic targeting, country-aware fit, work-right clarity/)
  assert.match(layout, /interview conversion/)

  assert.match(pricing, /Quality-first European tech applications/)
  assert.match(pricing, /strategic targeting, country-aware fit/)
  assert.match(pricing, /quality-over-quantity workflow/)
  assert.match(pricingCard, /interview-conversion prep/)

  assert.match(og, /STRATEGIC TECH APPLY/)
  assert.match(og, /Better applications/)
  assert.match(og, /stronger interviews/)
  assert.match(og, /Quality over quantity/)
})

let failed = 0

for (const { name, run } of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.error(`not ok - ${name}`)
    console.error(error)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
