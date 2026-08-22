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

test("Stripe refunds and disputes are logged for manual review, not auto-actioned", () => {
  const route = read("apps/web/app/api/stripe/webhook/route.ts")

  assert.match(route, /event\.type === "charge\.refunded"/)
  assert.match(route, /event\.type === "charge\.dispute\.created"/)
  assert.match(route, /await handleChargeRefunded\(eventObject\)/)
  assert.match(route, /await handleDisputeCreated\(eventObject\)/)
  assert.match(route, /area: "stripe"/)

  // Founder-approved policy: log for manual review, no automatic account
  // action. Neither handler should touch subscriptions, ai_credit_ledger,
  // or beta_access.
  const refundHandler = route.slice(
    route.indexOf("async function handleChargeRefunded"),
    route.indexOf("async function handleDisputeCreated"),
  )
  const disputeHandler = route.slice(
    route.indexOf("async function handleDisputeCreated"),
    route.indexOf("async function markInvoicePaymentFailed"),
  )
  for (const handler of [refundHandler, disputeHandler]) {
    assert.doesNotMatch(handler, /\.from\("subscriptions"\)\.update/)
    assert.doesNotMatch(handler, /\.from\("ai_credit_ledger"\)/)
    assert.doesNotMatch(handler, /\.from\("beta_access"\)/)
  }
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
    const featureGateIndex = route.indexOf("await reserveAiCall")

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

test("profile evidence sync is production cloud-first with local cache", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const cloudSync = read("apps/web/lib/cloud-sync.ts")

  assert.match(
    dashboard,
    /const productionSyncPreferences = cloudSyncReadiness\.configured\s*\?\s*\{\s*\.\.\.storedSyncPreferences,\s*profileAccountSyncEnabled: true\s*\}/
  )
  assert.match(
    dashboard,
    /if \(cloudSyncReadiness\.configured\) \{[\s\S]*?void loadDashboardSnapshot\(\{ force: true, silent: true \}\)\s*void loadProfileSnapshot\(\{ silent: true \}\)\s*\}/
  )
  assert.match(dashboard, /scheduleProfileSync\(nextState\.profile\)/)
  assert.match(dashboard, /scheduleDashboardSync\(state,\s*\{/)
  assert.match(
    cloudSync,
    /process\.env\.NEXT_PUBLIC_AUTOTIME_ENV === "production" \|\|\s*process\.env\.NODE_ENV === "production"/
  )
})

test("Proof Library stays a standalone reusable-proof workspace", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const userNav = read("apps/web/components/UserNav.tsx")
  const publicNav = read("apps/web/components/PublicNav.tsx")

  assert.match(userNav, /aliases: \["\/dashboard\/autofill-profile", "\/dashboard\/cv-tailor"\]/)
  assert.match(userNav, /label: "Profile"/)
  assert.match(userNav, /description: "Facts and proof"/)
  assert.doesNotMatch(userNav, /protocol-locked-link|90% before using/)
  assert.match(userNav, /href=\{item\.href\}/)
  assert.doesNotMatch(publicNav, /protocol-locked-link|90% before using/)
  assert.match(dashboard, /eyebrow: "Proof Library"/)
  assert.match(dashboard, /title: "Proof Library"/)
  assert.match(dashboard, /aria-label="Proof Library workspace"/)
  assert.match(dashboard, /Reusable reasons and proof/)
  assert.match(dashboard, /Keep the strongest reasons, evidence and answer/)
  assert.match(dashboard, /Profile first, job proof second/)
  assert.match(dashboard, /Application Kit\s*and Interview Prep feed reusable proof back here/)
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

  assert.match(dashboard, /title: "Check EU fit before you apply"/)
  assert.match(
    dashboard,
    /Check one role against your profile, country context and missing proof/
  )
  assert.match(dashboard, /Check EU fit/)
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
  assert.match(createApplicationFlow, /fitScore: autoTimeFitReview\.fitScore/)
  assert.match(createApplicationFlow, /fitDecision: fitEvaluation\.decision/)
  assert.match(createApplicationFlow, /contentGate: fitEvaluation\.contentGate/)

  assert.match(aiFlow, /requireCapability\("analyse_job"\)/)
  assert.match(aiFlow, /hasJobDraft\(state\.jobAnalysis\)/)
  assert.match(aiFlow, /fetchAiJobAnalysis\(/)
  assert.match(aiFlow, /profile: state\.profile/)
  assert.match(aiFlow, /persist\(next, "AI fit assistant updated the role analysis"\)/)

  assert.match(saveFlow, /requireCapability\("analyse_job"\)/)
  assert.match(saveFlow, /hasJobDraft\(state\.jobAnalysis\)/)
  assert.match(saveFlow, /createApplication\(/)
  assert.match(saveFlow, /autoTimeFitReview/)
  assert.match(saveFlow, /createEvidenceRecords\(/)
  assert.match(saveFlow, /createOutcomeRecord\(application\)/)
  assert.match(saveFlow, /syncDashboardStateToCloud\(nextState/)
  assert.match(saveFlow, /openDashboardView\("applications"\)/)

  assert.match(fitModel, /export function evaluateCountryFit/)
  assert.match(fitModel, /export function evaluateAutoTimeFitScore/)
  assert.match(fitModel, /getSponsorshipLikelihood/)
  assert.match(fitModel, /getRightToWorkCompatibility/)
  assert.match(fitModel, /getCountryLocationFit/)
  assert.match(fitModel, /contentGate/)
})

test("Interview Prep keeps coaching, prep packs and reusable answers separated", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(dashboard, /title: "Interview Prep"/)
  assert.match(dashboard, /Turn saved job proof into interview answers and prep packs/)
  assert.match(dashboard, /aria-label="Interview Prep workflow"/)
  assert.match(dashboard, /Choose the question/)
  assert.match(dashboard, /Add rough notes/)
  assert.match(dashboard, /Review the coach/)
  assert.match(dashboard, /Save reusable wording/)
  assert.match(dashboard, /aria-label="Interview Prep responsibility"/)
  assert.match(dashboard, /Reusable reasons go to Proof Library/)
  assert.match(
    dashboard,
    /The full prep pack stays with the job/
  )
  assert.match(dashboard, /Interview prep and Proof Library synced/)
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

  assert.match(saveAnswerFlow, /requireCapability\("prepare_interview"/)
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
  assert.match(dashboard, /See which tracked job needs action next/)
  assert.match(dashboard, /function hasFollowUpAction\(application: ApplicationRecord\)/)
  assert.match(dashboard, /application\.nextActionDate/)
  assert.match(dashboard, /\["Applied", "Interview", "Offer"\]\.includes\(application\.status\)/)
  assert.match(dashboard, /aria-label="Follow-up workflow"/)
  assert.match(dashboard, /Only jobs with a date, action or in-flight status appear/)
  assert.match(dashboard, /aria-label="Follow-up responsibility"/)
  assert.match(dashboard, /Clear scheduled action/)

  assert.match(dashboard, /title: "Progress"/)
  assert.match(dashboard, /Review what happened across tracked jobs/)
  assert.match(dashboard, /aria-label="Progress workflow"/)
  assert.match(dashboard, /Track outcomes/)
  assert.match(dashboard, /Run report/)
  assert.match(dashboard, /aria-label="Progress responsibility"/)
  assert.match(dashboard, /Use Fit Analysis to score a role, Follow-ups to act/)
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
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
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

  assert.match(dashboard, /aria-label="Strategic quality system"/)
  assert.match(dashboard, /Your application workflow/)
  assert.match(dashboard, /strategicQualitySignals/)
  assert.match(dashboard, /Target roles/)
  assert.match(dashboard, /Country-aware fit/)
  assert.match(dashboard, /Profile proof/)
  assert.match(dashboard, /Interview prep/)

  assert.match(og, /STRATEGIC TECH APPLY/)
  assert.match(og, /Better applications/)
  assert.match(og, /stronger interviews/)
  assert.match(og, /Quality over quantity/)
})

test("Client fallbacks surface and record runtime and action failures", () => {
  const layout = read("apps/web/app/layout.tsx")
  const reporter = read("apps/web/components/ClientFallbackReporter.tsx")
  const clientDiagnostics = read("apps/web/lib/client-diagnostics.ts")
  const diagnosticsRoute = read("apps/web/app/api/diagnostics/client/route.ts")
  const routeError = read("apps/web/app/error.tsx")
  const globalError = read("apps/web/app/global-error.tsx")
  const login = read("apps/web/components/LoginContent.tsx")
  const pricingCard = read("apps/web/components/PricingCard.tsx")
  const extensionConnect = read("apps/web/components/ExtensionConnect.tsx")

  assert.match(layout, /<ClientFallbackReporter \/>/)
  assert.match(reporter, /window\.addEventListener\("error"/)
  assert.match(reporter, /window\.addEventListener\("unhandledrejection"/)
  assert.match(reporter, /role="alert"/)
  assert.match(reporter, /reportClientIssue/)
  assert.match(clientDiagnostics, /\/api\/diagnostics\/client/)
  assert.match(diagnosticsRoute, /"auth"/)
  assert.match(diagnosticsRoute, /"billing"/)
  assert.doesNotMatch(diagnosticsRoute, /diagnostics\.client\.auth\.blocked/)
  assert.match(diagnosticsRoute, /authenticated: Boolean\(user\)/)
  assert.match(routeError, /app\.route\.error-boundary/)
  assert.match(globalError, /app\.global\.error-boundary/)
  assert.match(login, /auth\.oauth\.start\.failed/)
  assert.match(pricingCard, /billing\.checkout\.start\.failed/)
  assert.match(extensionConnect, /extension\.connect\.unhandled/)
})

test("login page survives a misconfigured Supabase client instead of crashing to the error boundary", () => {
  // Reproduced live: LoginForm's mount effect called createBrowserClient()
  // directly with no try/catch. When NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are
  // missing or invalid, that throws ConfigurationUnavailableError
  // synchronously inside the effect, which crashed the entire /login page to
  // the generic error.tsx fallback - the one page where that's most
  // damaging, since it leaves zero path to sign in. Every other
  // createBrowserClient() call site in the app already wraps it in a
  // try/catch; this asserts LoginContent does too, and that it maps the
  // config error to the same user-facing message used elsewhere (not the
  // raw internal "Required service configuration is unavailable" string).
  const login = read("apps/web/components/LoginContent.tsx")

  assert.match(login, /isConfigurationUnavailableError/)
  assert.match(login, /configurationUnavailableMessage/)
  assert.match(
    login,
    /try\s*\{[\s\S]{0,40}createBrowserClient\(\)[\s\S]{0,40}\}\s*catch/
  )
})

test("feature readiness supersedes the universal profile lock", () => {
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const readiness = read("apps/web/lib/capability-readiness.ts")

  assert.doesNotMatch(
    dashboard,
    /requireProfileExecutionReady/
  )
  assert.match(
    readiness,
    /"prepare_application"[\s\S]*"evidence_confirmation"/
  )
})

test("every AI route reserves a call slot before the provider request and releases it on failure", () => {
  const routesAndProviderCalls = [
    ["apps/web/app/api/ai/analyse/route.ts", "analyseJobWithOpenAI"],
    ["apps/web/app/api/ai/content/route.ts", "generateContentWithOpenAI"],
    ["apps/web/app/api/ai/interview/route.ts", "generateInterviewPrepWithOpenAI"],
    ["apps/web/app/api/ai/interview-answer/route.ts", "generateInterviewAnswerWithOpenAI"],
    ["apps/web/app/api/ai/profile-context/route.ts", "reviewProfileContextWithOpenAI"],
    ["apps/web/app/api/ai/tailor-cv/route.ts", "tailorCvWithOpenAI"],
    ["apps/web/app/api/ai/cover-letter/route.ts", "tailorCoverLetterWithOpenAI"],
    ["apps/web/app/api/ai/cv-enrich/route.ts", "extractCvEnrichmentWithOpenAI"],
    ["apps/web/app/api/ai/technical-interview/route.ts", "generateTechnicalInterviewDrillsWithOpenAI"],
    ["apps/web/app/api/ai/work-authorisation/route.ts", "reviewWorkAuthorisationWithOpenAI"],
    ["apps/web/app/api/esco/questionnaire/route.ts", "runEscoQuestionnaireRoundWithOpenAI"],
    ["apps/web/app/api/outreach/route.ts", "draftOutreachWithOpenAI"],
  ]

  for (const [routePath, providerCall] of routesAndProviderCalls) {
    const route = read(routePath)
    const reserveIndex = route.indexOf("await reserveAiCall")
    const providerIndex = route.indexOf(providerCall + "(")
    // A release call guarding an earlier guardrail/validation early-return
    // (before the provider call) is also valid - only a release reachable
    // *after* the provider call (in its own catch block) proves this
    // specific failure mode is covered, so search from providerIndex on.
    const releaseIndex = route.indexOf("await releaseAiCall", providerIndex)
    const finalizeIndex = route.indexOf("await finalizeAiCall", providerIndex)

    assert.notEqual(reserveIndex, -1, `${routePath}: no reserveAiCall call`)
    assert.notEqual(providerIndex, -1, `${routePath}: no ${providerCall} call`)
    assert.notEqual(releaseIndex, -1, `${routePath}: no releaseAiCall call after the provider call`)
    assert.notEqual(finalizeIndex, -1, `${routePath}: no finalizeAiCall call after the provider call`)

    // The reservation must happen before the real, paid provider call -
    // this is the actual fix: a plain read-then-write check let concurrent
    // requests all pass the allowance/credit check before any of them
    // reached OpenAI. releaseAiCall must appear between the two (in the
    // catch block guarding the provider call) so a failed generation never
    // costs the caller an allowance slot or a purchased credit, and
    // finalizeAiCall must come after the provider call succeeds.
    assert.ok(reserveIndex < providerIndex, `${routePath}: reservation must precede the provider call`)
    assert.ok(providerIndex < releaseIndex, `${routePath}: release must be reachable after the provider call (in its catch block)`)
    assert.ok(providerIndex < finalizeIndex, `${routePath}: finalize must come after the provider call`)
    assert.doesNotMatch(
      route,
      /assertCanUseAi|trackAiCall/,
      `${routePath}: must not use the old, racy check-then-track functions`,
    )
  }
})

test("the AI-call reservation RPC is atomic per user and refunds a consumed credit on release", () => {
  const migration = read("supabase/migrations/20260821160000_atomic_ai_call_reservation.sql")

  assert.match(
    migration,
    /create or replace function public\.reserve_ai_call/,
  )
  assert.match(
    migration,
    /pg_advisory_xact_lock\(hashtext\(p_user_id::text \|\| ':ai_reserve'\)\)/,
  )
  // The lock must be acquired, and the reservation row inserted, before
  // returning - otherwise a second concurrent call could still race past
  // the count check while the first call's OpenAI request is still in
  // flight (the actual bug: the row that makes concurrent requests visible
  // to each other didn't exist until *after* the provider call succeeded).
  const reserveBody = migration.slice(
    migration.indexOf("create or replace function public.reserve_ai_call"),
    migration.indexOf("create or replace function public.confirm_ai_call"),
  )
  assert.match(reserveBody, /insert into public\.ai_usage/)
  assert.match(
    migration,
    /create or replace function public\.release_ai_call/,
  )
  assert.match(
    migration,
    /insert into public\.ai_credit_ledger \(user_id, delta, reason, feature\)\s*\n\s*values \(v_user_id, 1, 'refund', 'ai-call-release'\)/,
  )
  assert.match(
    migration,
    /grant execute on function public\.reserve_ai_call\(uuid, uuid, integer\) to service_role/,
  )
})

test("get_monthly_ai_calls has an explicit grant, matching every sibling RPC", () => {
  const migration = read(
    "supabase/migrations/20260822100000_pin_get_monthly_ai_calls_grant.sql",
  )

  assert.match(
    migration,
    /grant execute on function public\.get_monthly_ai_calls\(uuid\) to authenticated;/,
  )
})

test("stripe_webhook_events and ai_rate_limits explicitly revoke client access, matching the other service-role-only tables", () => {
  const migration = read(
    "supabase/migrations/20260822110000_explicit_revoke_stripe_events_rate_limits.sql",
  )

  assert.match(
    migration,
    /revoke all on table public\.stripe_webhook_events from public, anon, authenticated;/,
  )
  assert.match(
    migration,
    /revoke all on table public\.ai_rate_limits from public, anon, authenticated;/,
  )
})

test("cover letter and outreach message writes verify the referenced job belongs to the same account", () => {
  const coverLetter = read("apps/web/app/api/ai/cover-letter/route.ts")
  const outreach = read("apps/web/app/api/outreach/route.ts")

  const coverLetterOwnershipIndex = coverLetter.indexOf(
    'from("applications").select("id").eq("id",body.jobId).eq("user_id",user.id)',
  )
  const coverLetterInsertIndex = coverLetter.indexOf(
    'from("cover_letters").insert(',
  )
  assert.notEqual(coverLetterOwnershipIndex, -1)
  assert.notEqual(coverLetterInsertIndex, -1)
  assert.ok(coverLetterOwnershipIndex < coverLetterInsertIndex)

  const outreachOwnershipIndex = outreach.indexOf(
    'from("applications").select("id").eq("id", body.jobId).eq("user_id", user.id)',
  )
  const outreachInsertIndex = outreach.indexOf('from("outreach_messages").insert(')
  assert.notEqual(outreachOwnershipIndex, -1)
  assert.notEqual(outreachInsertIndex, -1)
  assert.ok(outreachOwnershipIndex < outreachInsertIndex)
})

test("workflow_dispatch confirmation/boolean inputs are passed via env, not interpolated into run: steps", () => {
  // Substituting github.event.inputs.* straight into a `run:` block before
  // the shell parses the line is the classic GitHub Actions script-injection
  // pattern - a crafted input value can break out of its quoted context and
  // run as an injected command. The safe pattern passes the input through
  // `env:` and references it as a shell variable instead.
  const k6 = read(".github/workflows/k6-manual.yml")
  assert.match(k6, /CONFIRM_INPUT: \$\{\{ github\.event\.inputs\.confirm \}\}/)
  assert.match(k6, /if \[ "\$CONFIRM_INPUT" != "\$expected" \]/)
  assert.doesNotMatch(k6, /if \[ "\$\{\{ github\.event\.inputs\.confirm \}\}"/)

  const visualRegression = read(".github/workflows/visual-regression.yml")
  assert.match(
    visualRegression,
    /UPDATE_SNAPSHOTS: \$\{\{ github\.event\.inputs\.update_snapshots \}\}/,
  )
  assert.match(visualRegression, /if \[ "\$UPDATE_SNAPSHOTS" = "true" \]/)
  assert.doesNotMatch(
    visualRegression,
    /if \[ "\$\{\{ github\.event\.inputs\.update_snapshots \}\}"/,
  )
})

test("diagnostics client route rate-limits before logging (unauthenticated writes are otherwise unbounded)", () => {
  const route = read("apps/web/app/api/diagnostics/client/route.ts")
  const parseIndex = route.indexOf("clientDiagnosticSchema.parse")
  const rateLimitIndex = route.indexOf("await assertDiagnosticRouteRateLimit")
  const logIndex = route.indexOf("logDiagnostic(diagnostic")

  assert.notEqual(rateLimitIndex, -1)
  assert.notEqual(logIndex, -1)
  assert.ok(parseIndex < rateLimitIndex)
  assert.ok(rateLimitIndex < logIndex)
})

test("the public analytics service and its authenticated proxy both gate on the shared internal secret", () => {
  const service = read("apps/analytics/main.py")
  const proxyRoute = read(
    "apps/web/app/api/analytics/evidence-outcomes/route.ts",
  )

  // apps/analytics is a separate Python service reachable at a public
  // production URL (vercel.json routes /analytics to it) - it can't
  // validate a Supabase session itself, so /evidence-outcomes must reject
  // any call missing the shared secret, and the proxy route must
  // authenticate the caller before it ever forwards that secret.
  assert.match(service, /dependencies=\[Depends\(require_internal_secret\)\]/)
  assert.match(service, /def require_internal_secret/)

  const authIndex = proxyRoute.indexOf("await getRequestUser(request)")
  const forwardIndex = proxyRoute.indexOf("x-analytics-secret")
  assert.notEqual(authIndex, -1)
  assert.notEqual(forwardIndex, -1)
  assert.ok(authIndex < forwardIndex)
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
