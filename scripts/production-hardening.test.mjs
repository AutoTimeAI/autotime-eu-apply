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
    const delegated = routePath.endsWith("/content/route.ts")
    const rateLimitIndex = delegated
      ? route.indexOf("assertAllowed: assertAiRouteRateLimit")
      : route.indexOf("await assertAiRouteRateLimit")
    const featureGateIndex = delegated
      ? route.indexOf("reserve: reserveAiCall")
      : route.indexOf("await reserveAiCall")

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
  const resumeInference = read("apps/web/domains/product-context/resume-inference.ts")

  assert.match(resumeInference, /export function inferCandidateDetailsFromResume/)
  assert.match(resumeInference, /roleTitleKeywords/)
  assert.match(resumeInference, /!includesAny\(line, roleTitleKeywords\)/)
  assert.match(resumeInference, /currentCountry = locationLine/)
  assert.match(dashboard, /currentProfile\.fullName\.trim\(\)/)
  assert.match(dashboard, /inferredDetails\.fullName/)
  assert.match(dashboard, /canUseInferredCurrentCountry/)
  assert.doesNotMatch(resumeInference, /gender|ethnicity|marital|nationality|dateOfBirth/i)
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

test("Profile & CV nav item points at the real profile-evidence and CV-tailor pages", () => {
  // Was "Proof Library stays a standalone reusable-proof workspace". The
  // DashboardExperience.tsx assertions this test used to carry (eyebrow/
  // title/aria-label "Proof Library", the CV-proof/reusable-answers
  // wiring) tested a `currentTab === "profile" && activeFocus ===
  // "cv-tailor"` block that is confirmed unreachable: activeFocus is
  // `focus ?? defaultDashboardFocusByView[view]`, and the sole
  // <DashboardExperience> call site (app/dashboard/profile-evidence/
  // page.tsx) always passes focus="profile-evidence" - "cv-tailor" can
  // never be selected, with no setter anywhere to change it client-side.
  // Removed 2026-09-23 as confirmed dead code (superseded by CVWorkspace.tsx
  // at the real /dashboard/cv-tailor route on 2026-08-02, never cleaned up).
  // What remains here - the nav item's real wiring - still matters and
  // still passes.
  const userNav = read("apps/web/components/UserNav.tsx")
  const publicNav = read("apps/web/components/PublicNav.tsx")

  assert.match(userNav, /aliases: \["\/dashboard\/profile-evidence", "\/dashboard\/cv-tailor"\]/)
  assert.match(userNav, /label: "Profile & CV"/)
  assert.match(userNav, /description: "Facts, proof and your canonical CV"/)
  assert.doesNotMatch(userNav, /protocol-locked-link|90% before using/)
  assert.match(userNav, /href=\{item\.href\}/)
  assert.doesNotMatch(publicNav, /protocol-locked-link|90% before using/)
})

test("EU fit review model wires createApplication into the real Jobs flow", () => {
  // Was "Analyse Fit pillar keeps 360 workflow wiring intact", asserting on
  // a `currentTab === "jobs"` block in DashboardExperience.tsx. Confirmed
  // unreachable 2026-09-23 (see the "Profile & CV nav item" test above for
  // why) - the real job-fit-check flow is JobApplicationWorkspace.tsx's
  // JobDetail component (real route: /dashboard/jobs/[jobId]), which calls
  // the same fit-review/fit-model modules directly, more simply than the
  // dead dashboard copy did (no createEvidenceRecords/createOutcomeRecord/
  // syncDashboardStateToCloud - those were specific to the dead flow's own
  // bookkeeping). This test now verifies the modules' real contract and
  // the real caller's wiring instead.
  const fitModel = read("packages/shared/src/fit-model.ts")
  const fitReview = read("apps/web/domains/eu-fit/fit-review.ts")
  const jobWorkspace = read("apps/web/components/JobApplicationWorkspace.tsx")

  assert.match(fitReview, /export function createApplication\(/)
  assert.match(fitReview, /nextAction: fitEvaluation\.nextBestAction/)
  assert.match(fitReview, /fitScore: autoTimeFitReview\.fitScore/)
  assert.match(fitReview, /fitDecision: fitEvaluation\.decision/)
  assert.match(fitReview, /contentGate: fitEvaluation\.contentGate/)

  assert.match(fitModel, /export function evaluateCountryFit/)
  assert.match(fitModel, /export function evaluateAutoTimeFitScore/)
  assert.match(fitModel, /getSponsorshipLikelihood/)
  assert.match(fitModel, /getRightToWorkCompatibility/)
  assert.match(fitModel, /getCountryLocationFit/)
  assert.match(fitModel, /contentGate/)

  assert.match(jobWorkspace, /createApplication,/)
  assert.match(jobWorkspace, /const application = createApplication\(job\)/)
})

test("Interview coaching keeps validated input and reusable-answer wiring intact", () => {
  // Was "Interview Prep keeps coaching, prep packs and reusable answers
  // separated". Its JSX-text assertions and the whole `prepFlow` half
  // (generateInterviewPrep, getInterviewPrepGuardrails, POST /api/ai/
  // interview, createLocalInterviewPrepPack) tested a `currentTab ===
  // "interview"` block confirmed unreachable 2026-09-23 (see the "Profile
  // & CV nav item" test above) - generateInterviewPrep now has zero
  // remaining call sites anywhere in the file. The real, reachable
  // InterviewsWorkspace.tsx (the actual /dashboard/interviews route) has
  // no equivalent AI-prep-pack feature at all currently - this was an
  // orphaned capability, not a duplicate of something real elsewhere,
  // worth a product decision on whether to rebuild it there or drop it.
  //
  // The saveAnswerFlow/interviewPolicy assertions below are NOT part of
  // that removal - generateInterviewBuddyAnswers (a different function)
  // still calls validateInterviewBuddyInput from a live call site
  // (line ~4539, pre-existing, untouched by the 2026-09-23 cleanup), so
  // that wiring remains real and worth checking.
  const dashboard = read("apps/web/components/DashboardExperience.tsx")
  const interviewPolicy = read("apps/web/domains/interviews/interview-buddy-policy.ts")

  assert.match(dashboard, /validateInterviewBuddyInput/)
  assert.match(interviewPolicy, /const tokens = getMeaningfulTokens\(value\)/)
  assert.match(interviewPolicy, /tokens\.some\(\(token\) => \/\(\.\)\\1\{3,\}\//)

  const saveAnswerStart = dashboard.indexOf(
    "const saveFinalInterviewAnswer = () =>"
  )
  const speakStart = dashboard.indexOf("const speakInterviewAnswer = (")

  assert.notEqual(saveAnswerStart, -1)
  assert.notEqual(speakStart, -1)

  const saveAnswerFlow = dashboard.slice(saveAnswerStart, speakStart)

  assert.match(saveAnswerFlow, /requireCapability\("prepare_interview"/)
  assert.match(
    saveAnswerFlow,
    /\[finalAnswerStorageKey\]: interviewBuddyOutputs\.strongFinalAnswer/
  )
  assert.match(saveAnswerFlow, /persist\(/)
  assert.match(saveAnswerFlow, /scheduleDashboardSync\(next/)
})

test("live follow-up and application routes do not depend on the legacy dashboard tracker", () => {
  const followUpsPage = read("apps/web/app/dashboard/follow-ups/page.tsx")
  const applicationsPage = read("apps/web/app/dashboard/applications/page.tsx")
  const insightsPage = read("apps/web/app/dashboard/insights/page.tsx")

  assert.match(followUpsPage, /OutreachWorkspace/)
  assert.doesNotMatch(followUpsPage, /DashboardExperience/)
  assert.match(applicationsPage, /JobApplicationWorkspace/)
  assert.doesNotMatch(applicationsPage, /DashboardExperience/)
  assert.match(insightsPage, /redirect\("\/dashboard\/applications"\)/)
  assert.doesNotMatch(insightsPage, /DashboardExperience/)
})
test("Public product promise matches the strategic European tech positioning", () => {
  // The dashboard-echo assertions this test used to carry (aria-label
  // "Strategic quality system", strategicQualitySignals, etc.) tested
  // DashboardExperience.tsx's dead `isOverview` home-screen block,
  // confirmed unreachable 2026-09-23 (see the "Profile & CV nav item"
  // test above) - strategicQualitySignals is now defined but never
  // referenced in any JSX in the file. The real dashboard home is
  // HomeExperience.tsx (app/dashboard/page.tsx), which this test does not
  // currently cover; the public-facing positioning checks below (login,
  // layout, pricing, OG image) are unaffected and still real.
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

test("login resolves sessions safely without putting Supabase in the initial client bundle", () => {
  const login = read("apps/web/components/LoginContent.tsx")
  const loginPage = read("apps/web/app/login/page.tsx")

  assert.match(login, /isConfigurationUnavailableError/)
  assert.match(login, /configurationUnavailableMessage/)
  assert.doesNotMatch(login, /^import .*createBrowserClient/m)
  assert.match(login, /await import\("\.\.\/lib\/supabase\/client"\)/)
  assert.match(loginPage, /try\s*\{[\s\S]*createServerClient\(\)[\s\S]*\}\s*catch/)
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

  const contentRoute = read("apps/web/app/api/ai/content/route.ts")
  const preparationUseCase = read("apps/web/domains/application-preparation/prepare-application-kit.ts")
  assert.match(contentRoute, /prepareApplicationKit\(\{/)
  assert.match(contentRoute, /assertAllowed: assertAiRouteRateLimit/)
  assert.match(contentRoute, /reserve: reserveAiCall/)
  assert.match(contentRoute, /release: releaseAiCall/)
  assert.match(contentRoute, /finalize:\s*\(reservationId, usage\)/)
  assert.match(contentRoute, /generator:\s*\{ generate: generateContentWithOpenAI \}/)
  assert.match(preparationUseCase, /const reservationId = await ports\.usage\.reserve\(userId\)/)
  assert.match(preparationUseCase, /const result = await ports\.generator\.generate\(input\)/)
  assert.match(preparationUseCase, /await ports\.usage\.release\(reservationId\)/)
  assert.match(preparationUseCase, /await ports\.usage\.finalize\(reservationId/)
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

test("every admin read route sends the same private, no-store cache header", () => {
  const routes = [
    "apps/web/app/api/admin/overview/route.ts",
    "apps/web/app/api/admin/users/route.ts",
    "apps/web/app/api/admin/feedback/route.ts",
    "apps/web/app/api/admin/ai-operations/route.ts",
    "apps/web/app/api/admin/market-data/route.ts",
    "apps/web/app/api/admin/audit-log/route.ts",
  ]

  for (const routePath of routes) {
    assert.match(
      read(routePath),
      /"Cache-Control":\s*"private, no-store"/,
      routePath,
    )
  }
})

test("the home page's follow-up-due check anchors to the start of the due date, not the end", () => {
  // Comparing against T23:59:59 instead of T00:00:00 means a follow-up due
  // "today" doesn't get flagged until nearly midnight that night, delaying
  // the home page's single "next best action" nudge by up to a full day.
  // DashboardExperience.tsx's getNextActionTiming already anchors the same
  // kind of due-date check to the start of the day - this must match it.
  const home = read("apps/web/components/HomeExperience.tsx")
  assert.match(home, /\$\{application\.followUpDate\}T00:00:00/)
  assert.doesNotMatch(home, /\$\{application\.followUpDate\}T23:59:59/)
})

test("admin login preserves the post-login redirect target instead of always discarding it", () => {
  // getUnauthenticatedRedirect (proxy-policy.ts) sends an unauthenticated
  // admin visiting a deep link (e.g. /admin/users) to
  // /admin/login?redirectTo=/admin/users - the page's own safeRedirect
  // check previously had both ternary branches return the same literal
  // "/admin", silently discarding that value on every login regardless of
  // where the admin actually came from.
  const page = read("apps/web/app/(admin-auth)/admin/login/page.tsx")

  assert.doesNotMatch(
    page,
    /=== "\/admin" \? "\/admin" : "\/admin"/,
    "both ternary branches must not return the same literal",
  )
  assert.match(page, /candidate === "\/admin" \|\| candidate\.startsWith\("\/admin\/"\)/)
  assert.match(page, /candidate\.includes\("\\\\"\)/)
})

test("job workflow application upserts verify the referenced job belongs to the same account before writing", () => {
  const repository = read("apps/web/lib/job-workflow-repository.ts")
  const upsertApplicationBody = repository.slice(
    repository.indexOf("export async function upsertApplication"),
  )

  const referencedJobCheckIndex = upsertApplicationBody.indexOf(
    'from("job_workflow_jobs")',
  )
  const existingLookupIndex = upsertApplicationBody.indexOf(
    'select("updated_at")',
  )

  assert.notEqual(referencedJobCheckIndex, -1)
  assert.match(
    upsertApplicationBody.slice(0, existingLookupIndex),
    /if \(!referencedJob\) \{\s*throw new Error/,
  )
  assert.ok(referencedJobCheckIndex < existingLookupIndex)
})

test("job workflow sync distinguishes a disabled server from a real upload failure", () => {
  const hook = read("apps/web/lib/useJobWorkflowSync.ts")
  const uploadBody = hook.slice(
    hook.indexOf("const upload = useCallback"),
    hook.indexOf("const sync = useCallback"),
  )

  const statusCheckIndex = uploadBody.indexOf('response.status === 404')
  const genericThrowIndex = uploadBody.indexOf(
    'throw new Error("Account sync could not be completed.")',
  )

  assert.notEqual(statusCheckIndex, -1)
  assert.notEqual(genericThrowIndex, -1)
  assert.ok(statusCheckIndex < genericThrowIndex)
  assert.match(uploadBody, /setState\("server-disabled"\)/)
})

test("interview upserts verify the referenced application and job belong to the same account before writing", () => {
  const repository = read("apps/web/lib/interview-workflow-repository.ts")
  const upsertInterviewBody = repository.slice(
    repository.indexOf("export async function upsertInterview"),
  )

  const applicationCheckIndex = upsertInterviewBody.indexOf(
    'from("job_workflow_applications")',
  )
  const jobCheckIndex = upsertInterviewBody.indexOf('from("job_workflow_jobs")')
  const existingLookupIndex = upsertInterviewBody.indexOf(
    'select("updated_at")',
  )

  assert.notEqual(applicationCheckIndex, -1)
  assert.notEqual(jobCheckIndex, -1)
  assert.match(
    upsertInterviewBody.slice(0, existingLookupIndex),
    /if \(!referencedApplication \|\| !referencedJob\) \{\s*throw new Error/,
  )
  assert.ok(applicationCheckIndex < existingLookupIndex)
  assert.ok(jobCheckIndex < existingLookupIndex)
})

test("account deletion also cleans up the user's profile-photo storage objects, not just DB rows", () => {
  const route = read("apps/web/app/api/account/route.ts")

  // Supabase Storage objects have no FK to auth.users - only an RLS policy
  // scoping them by folder name to auth.uid() - so ON DELETE CASCADE never
  // reaches them. Without an explicit cleanup step, a deleted account
  // leaves its profile photo (a real personal image) orphaned forever.
  const cleanupIndex = route.indexOf("async function deleteProfilePhotos")
  const deleteUserIndex = route.indexOf("auth.admin.deleteUser")
  const callSiteIndex = route.indexOf("await deleteProfilePhotos(")

  assert.notEqual(cleanupIndex, -1)
  assert.notEqual(callSiteIndex, -1)
  assert.ok(callSiteIndex < deleteUserIndex)

  const cleanupBody = route.slice(cleanupIndex)
  assert.match(cleanupBody, /\.storage\s*\n?\s*\.from\("profile-photos"\)/)
  assert.match(cleanupBody, /\.list\(userId\)/)
  assert.match(cleanupBody, /\.remove\(paths\)/)
})

test("classify_job_listings_esco has an explicit grant, matching every sibling RPC", () => {
  // Both migrations that ever defined this function only ran
  // `revoke all ... from public, anon, authenticated`, with no matching
  // `grant execute ... to service_role` - since that revoke removes the
  // function's only privilege (the default PUBLIC grant every new function
  // gets on creation), no role could ever call it, so ESCO classification
  // of aggregated job listings silently failed on every cron run.
  const migration = read(
    "supabase/migrations/20260822130000_grant_classify_job_listings_esco.sql",
  )

  assert.match(
    migration,
    /grant execute on function public\.classify_job_listings_esco\(integer\) to service_role;/,
  )
})

test("every admin page catches its own authorization failure instead of letting it hit the generic error boundary", () => {
  // requireAdminPrincipal throws a plain AdminAuthorizationError - Next.js
  // does not let a parent layout's try/catch catch an exception thrown
  // during a child page's own separate async render, so a page calling
  // requireAdminPrincipal directly (instead of the wrapped
  // requireAdminPageAccess) would have a permission failure escape past
  // the /admin layout's redirect logic and hit the app's generic root
  // error.tsx - a confusing message plus a spurious Sentry report for what
  // is really just an expected authorization boundary. Every admin page
  // must use the wrapper, which redirects the same way the layout does.
  const pages = [
    "apps/web/app/admin/page.tsx",
    "apps/web/app/admin/users/page.tsx",
    "apps/web/app/admin/feedback/page.tsx",
    "apps/web/app/admin/ai-operations/page.tsx",
    "apps/web/app/admin/market-data/page.tsx",
    "apps/web/app/admin/feature-flags/page.tsx",
    "apps/web/app/admin/audit-log/page.tsx",
  ]

  for (const pagePath of pages) {
    const page = read(pagePath)
    assert.match(page, /requireAdminPageAccess\(/, pagePath)
    assert.doesNotMatch(page, /requireAdminPrincipal\(/, pagePath)
  }

  const lib = read("apps/web/lib/admin-authorization.ts")
  assert.match(
    lib,
    /export async function requireAdminPageAccess\(/,
  )
  assert.match(lib, /error instanceof AdminAuthorizationError/)
  assert.match(
    lib,
    /redirect\(\s*error\.status === 401 \? "\/admin\/login" : "\/admin\/login\?adminDenied=1",?\s*\)/,
  )
})

test("interview outcome learningSignals condition is not a dead no-op ternary", () => {
  // Found by an independent review pass over this PR before merge: the
  // logic fix itself only had pnpm typecheck as its test plan, with no
  // assertion that would catch a regression back to the dead-ternary
  // shape (or a wrong condition). This component embeds the fix inline in
  // a JSX onClick handler with no extracted, directly-importable function,
  // so a static-inspection check matches the convention already used
  // elsewhere in this file for component-level logic fixes.
  const workspace = read("apps/web/components/InterviewsWorkspace.tsx")

  assert.doesNotMatch(
    workspace,
    /employerReason \|\| interpretation\s*\n?\s*\?\s*\["unknown"\]\s*\n?\s*:\s*\["unknown"\]/,
    "both ternary branches must not return the same literal",
  )
  assert.match(
    workspace,
    /learningSignals:\s*\n?\s*employerReason \|\| interpretation \? \["unknown"\] : \[\]/,
  )
})

test("AI route CV and outreach free-text fields have upper size bounds, not just a lower one", () => {
  // cv/outreach fields previously had no .max() at all, so a client could
  // submit an arbitrarily large payload (thousands of experience entries
  // with megabyte-long bullets) and inflate OpenAI token cost per call -
  // unlike jobDescription in the same schemas, which was already capped.
  const tailorCv = read("apps/web/app/api/ai/tailor-cv/route.ts")
  const coverLetter = read("apps/web/app/api/ai/cover-letter/route.ts")
  const outreach = read("apps/web/app/api/outreach/route.ts")

  assert.match(tailorCv, /summary: z\.string\(\)\.max\(4000\)/)
  assert.match(tailorCv, /bullets: z\.array\(z\.string\(\)\.max\(1000\)\)\.max\(40\)/)
  assert.match(tailorCv, /skills: z\.array\(z\.string\(\)\.max\(100\)\)\.max\(200\)/)

  assert.match(coverLetter, /summary:z\.string\(\)\.max\(4000\)/)
  assert.match(coverLetter, /skills:z\.array\(z\.string\(\)\.max\(100\)\)\.max\(200\)/)

  assert.match(outreach, /candidateSummary: z\.string\(\)\.trim\(\)\.min\(20\)\.max\(5000\)/)
  assert.match(
    outreach,
    /candidateKeyStrengths: z\.array\(z\.string\(\)\.trim\(\)\.min\(1\)\.max\(200\)\)\.min\(1\)\.max\(20\)/,
  )
  // recruiterEmail was missed in the initial pass - z.string().email() has
  // no length cap of its own, so an "email-shaped" string with a huge
  // local-part (e.g. 100k "a" characters before the @) could still inflate
  // the OpenAI prompt this field flows into via draftOutreachWithOpenAI.
  assert.match(outreach, /recruiterEmail: z\.string\(\)\.trim\(\)\.email\(\)\.max\(254\)/)
})

test("cloud-sync polling cannot silently overwrite a profile or dashboard edit still in flight", () => {
  // hasUnsyncedDashboardChangesRef already guarded loadDashboardSnapshot
  // against a silent background poll overwriting a debounced-but-not-yet-
  // synced write, but the recurring focus/visibility/3s-interval poll
  // passed force: true, which unconditionally bypassed that guard - and
  // loadProfileSnapshot had no equivalent guard or ref at all, so any
  // profile edit typed during its 1200ms sync debounce (or while the sync
  // request was still in flight) could be silently discarded by the next
  // poll's server response landing first.
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.match(dashboard, /const hasUnsyncedProfileChangesRef = useRef\(false\)/)
  assert.match(
    dashboard,
    /if \(silent && hasUnsyncedProfileChangesRef\.current\) \{\s*return false\s*\}/,
  )
  assert.match(dashboard, /hasUnsyncedProfileChangesRef\.current = true/)
  assert.match(dashboard, /hasUnsyncedProfileChangesRef\.current = !synced/)

  const refreshSyncedWorkflowIndex = dashboard.indexOf(
    "const refreshSyncedWorkflow = () => {",
  )
  const refreshSyncedWorkflowBody = dashboard.slice(
    refreshSyncedWorkflowIndex,
    refreshSyncedWorkflowIndex + 700,
  )
  assert.notEqual(refreshSyncedWorkflowIndex, -1)
  assert.doesNotMatch(
    refreshSyncedWorkflowBody,
    /loadDashboardSnapshot\(\{ force: true/,
    "the recurring poll must not force past the unsynced-changes guard",
  )
  assert.match(refreshSyncedWorkflowBody, /loadDashboardSnapshot\(\{ silent: true \}\)/)
})

test("admin_update_feature_flag takes its lock unconditionally, even when creating a brand-new flag", () => {
  // The original definition only locked via "select ... for update" when a
  // matching row already existed. Creating a new (key, environment) pair
  // has no row to lock, so two concurrent creates could both pass the
  // existence check unprotected and race on the "insert ... on conflict do
  // update" - the second caller would silently bump another caller's
  // just-created flag to version 2 without ever validating its version
  // against the row that now exists.
  const migration = read(
    "supabase/migrations/20260823100000_admin_feature_flag_create_lock.sql",
  )

  assert.match(
    migration,
    /create or replace function public\.admin_update_feature_flag/,
  )

  const lockIndex = migration.indexOf(
    "perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_key || ':' || p_environment, 0));",
  )
  const existenceCheckIndex = migration.indexOf(
    "select * into v_row from public.admin_feature_flags f where f.key = p_key and f.environment = p_environment for update;",
  )

  assert.notEqual(lockIndex, -1)
  assert.notEqual(existenceCheckIndex, -1)
  assert.ok(
    lockIndex < existenceCheckIndex,
    "the advisory lock must be taken before the existence/version check, not after",
  )
})

test("saveCurrentTabAsApplication does not clobber a fresh deletion-aware application list with a stale one", () => {
  // syncApplicationListToDashboard refreshes `applications` state itself
  // (via getApplications()) whenever the sync response includes
  // deletedApplicationIds - the backend can resurrect/merge a duplicate
  // record via resurrectUrlKey, which is exactly the call path this
  // function takes. It previously followed that call with
  // setApplications(applications), re-applying the array captured in the
  // outer closure *before* the sync ran - deterministically overwriting
  // the fresh, deletion-aware state with a list that still contains the
  // just-deleted duplicate record.
  const sidepanel = read("apps/extension/sidepanel/main.tsx")

  const functionIndex = sidepanel.indexOf(
    "const saveCurrentTabAsApplication = async () => {",
  )
  const nextFunctionIndex = sidepanel.indexOf(
    "\n  const ",
    functionIndex + "const saveCurrentTabAsApplication = async () => {".length,
  )
  assert.notEqual(functionIndex, -1)
  const functionBody = sidepanel.slice(functionIndex, nextFunctionIndex)

  assert.doesNotMatch(functionBody, /setApplications\(applications\)/)
  assert.match(functionBody, /resurrectUrlKey: normalizeApplicationUrlKey\(details\.url\)/)
})

test("outreach route only refunds the AI credit reservation if the OpenAI call itself fails, not a later DB write", () => {
  // cover-letter and tailor-cv routes only wrap the OpenAI call itself in
  // the release-on-failure try/catch, then finalize (charge) the
  // reservation before doing any DB persistence - a later DB failure after
  // a successful, already-charged generation is not refunded. The outreach
  // route previously wrapped both the OpenAI call AND the outreach_messages
  // insert in one try/catch, so a transient DB failure right after a
  // successful (and real-money) OpenAI call would call releaseAiCall,
  // silently refunding a credit for a generation that had already
  // succeeded and been paid for.
  const route = read("apps/web/app/api/outreach/route.ts")

  const releaseIndex = route.indexOf("releaseAiCall(reservationId)")
  const finalizeIndex = route.indexOf("finalizeAiCall(reservationId")
  const insertIndex = route.indexOf('.from("outreach_messages").insert(')

  assert.notEqual(releaseIndex, -1)
  assert.notEqual(finalizeIndex, -1)
  assert.notEqual(insertIndex, -1)
  assert.ok(
    releaseIndex < finalizeIndex,
    "release-on-failure must be scoped to the AI call, resolved before finalize runs",
  )
  assert.ok(
    finalizeIndex < insertIndex,
    "the DB insert must happen after the credit is finalized, so its own failure can't trigger a refund of an already-incurred cost",
  )
})

test("diagnostics.ts reuses the Sentry pipeline's broader, recursive redaction instead of its own shallow, exact-key-only list", () => {
  // sanitizeDetails previously only redacted a top-level, exact-match
  // config list (email, access_token, refresh_token, authorization,
  // password, secret, service_role) - common spellings like "token", "cv",
  // "resume", "jobDescription" and "phone" were never redacted, nested
  // objects were never scanned, and diagnostic.message (a public,
  // optionally-unauthenticated endpoint accepts an arbitrary client-
  // supplied message string, persisted into operational_logs and later
  // readable through the admin monitoring UI) was never redacted at all.
  const diagnostics = read("apps/web/lib/diagnostics.ts")
  const sentryPrivacy = read("apps/web/lib/sentry-privacy.ts")

  assert.match(
    diagnostics,
    /import \{ redactSensitiveUrlText, redactSensitiveValue \} from "\.\/sentry-privacy"/,
  )
  assert.match(diagnostics, /redactSensitiveValue\(configRedacted\)/)
  assert.match(diagnostics, /message: redactSensitiveUrlText\(diagnostic\.message\)/)

  const persistIndex = diagnostics.indexOf("persistOperationalLog(")
  const sanitizedDiagnosticDefinitionIndex = diagnostics.indexOf(
    "const sanitizedDiagnostic",
  )
  assert.notEqual(persistIndex, -1)
  assert.notEqual(sanitizedDiagnosticDefinitionIndex, -1)
  assert.ok(
    sanitizedDiagnosticDefinitionIndex < persistIndex,
    "the redacted diagnostic, not the original, must be what's persisted",
  )

  // The two redaction helpers must actually be exported for diagnostics.ts
  // to reuse rather than reimplement them.
  assert.match(sentryPrivacy, /export function redactSensitiveUrlText/)
  assert.match(sentryPrivacy, /export function redactSensitiveValue/)
})

test("capability-readiness education evidence reads a real field, not a copy-pasted duplicate of projects", () => {
  // CandidateProfile has no dedicated education field, so this was a
  // copy-paste of the "projects" line - education evidence silently
  // mirrored project-summary evidence instead of reflecting anything
  // about education, inflating confirmedEvidenceCount whenever
  // projectSummaries was filled in but nothing else was.
  const dashboard = read("apps/web/components/DashboardExperience.tsx")

  assert.doesNotMatch(
    dashboard,
    /education: Boolean\(state\.profile\.projectSummaries\.trim\(\)\)/,
  )
  assert.match(
    dashboard,
    /education: Boolean\(state\.profile\.baseCvText\.trim\(\)\)/,
  )
})

test("profile onboarding save is a single atomic upsert, not a read-then-branch insert/update race", () => {
  // Reading whether a profiles row exists, then branching to insert or
  // update, let two concurrent PATCHes for the same brand-new user (e.g. a
  // double-clicked "Next" on the first onboarding step) both see no
  // existing row and both attempt an insert - the loser hit the
  // unique(user_id) constraint and surfaced as a generic 500, silently
  // dropping that request's data.
  const route = read("apps/web/app/api/profile/onboarding/route.ts")

  assert.doesNotMatch(
    route,
    /const \{data:existing\}=await client\.from\("profiles"\)\.select/,
    "must not read for existence before deciding insert vs update",
  )
  assert.match(route, /const payload=\{user_id:user\.id,\.\.\.changes\}/)
  assert.match(route, /\.from\("profiles"\)\.upsert\(payload,\{onConflict:"user_id"\}\)/)
})

test("job/interview workflow sync helpers check every write's error instead of firing and forgetting", () => {
  // Supabase-js does not throw on a write failure by default. These
  // helper functions previously called .insert()/.upsert()/.delete()
  // without destructuring { error }, so a constraint violation (e.g. two
  // overlapping syncs racing on a unique(job_id, version) constraint) was
  // silently discarded - the outer upsertJob()/upsertInterview() reported
  // success to the client even though the write never actually landed.
  const jobWorkflow = read("apps/web/lib/job-workflow-repository.ts")
  const interviewWorkflow = read("apps/web/lib/interview-workflow-repository.ts")

  assert.match(
    jobWorkflow,
    /const \{ error \} = await client\.from\("job_workflow_analysis_snapshots"\)\.insert\(/,
  )
  assert.match(jobWorkflow, /if \(error\) throw new Error\("Job analysis snapshot could not be saved\."\)/)

  assert.match(
    interviewWorkflow,
    /const \{ error \} = await client\s*\.from\("interview_questions"\)\s*\.delete\(\)/,
  )
  assert.match(interviewWorkflow, /if \(error\) throw new Error\("Stale interview questions could not be removed\."\)/)
  assert.match(
    interviewWorkflow,
    /const \{ error \} = await client\s*\.from\("interview_questions"\)\s*\.upsert\(/,
  )
  assert.match(interviewWorkflow, /if \(error\) throw new Error\("Interview questions could not be saved\."\)/)
  assert.match(
    interviewWorkflow,
    /const \{ error \} = await client\.from\("interview_preparation_snapshots"\)\.insert\(/,
  )
  assert.match(
    interviewWorkflow,
    /if \(error\) throw new Error\("Interview preparation snapshot could not be saved\."\)/,
  )
})

test("decision lineage read verifies ownership before traversing the immutable ledger", () => {
  const route = read("apps/web/app/api/mobility/decisions/[decisionId]/route.ts")
  const ownershipCheck = route.indexOf('.eq("id", decisionId).eq("user_id", user.id).maybeSingle()')
  const relatedReads = route.indexOf('Promise.all([')

  assert.match(route, /getRequestUser\(request\)/)
  assert.ok(ownershipCheck > 0, "decision lookup must constrain both record ID and user ID")
  assert.ok(relatedReads > ownershipCheck, "related ledger reads must happen only after ownership succeeds")
  assert.match(route, /if \(!decisionResult\.data\).*status: 404/s)
  assert.match(route, /Cache-Control.*private, no-store, max-age=0/)
  assert.doesNotMatch(route, /encrypted_payload_reference/)
})

test("decision correction and synchronous replay actions are owned, append-only and idempotent", () => {
  const route = read("apps/web/app/api/mobility/decisions/[decisionId]/actions/route.ts")
  const ownershipCheck = route.indexOf('.eq("id", decisionId)')
  const firstInsert = route.indexOf('.from("mobility_decision_corrections").insert(')

  assert.match(route, /actionSchema\.parse\(await request\.json\(\)\)/)
  assert.ok(ownershipCheck > 0 && firstInsert > ownershipCheck)
  assert.match(route, /\.eq\("user_id", user\.id\)/)
  assert.match(route, /state: "submitted"/)
  assert.match(route, /state: "succeeded"/)
  assert.match(route, /completed_at: now/)
  assert.match(route, /idempotency_key/)
  assert.match(route, /\.eq\("idempotency_key", idempotencyKey\)/)
  assert.match(route, /inserted\.error\?\.code === "23505"/)
  assert.doesNotMatch(route, /mobility_decision_records"\)\.update/)
  assert.doesNotMatch(route, /mobility_decision_records"\)\.delete/)
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
