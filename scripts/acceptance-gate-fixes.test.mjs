import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import {
  getOfficialSources,
  officialCountrySources
} from "../apps/web/domains/eu-fit/official-sources.ts"
import {
  isHighRiskProfileField,
  getHighRiskProfileFieldReason
} from "../apps/web/domains/profile/high-risk-fields.ts"

// analytics.ts imports "./env" without an extension, which only resolves
// under the Next.js/webpack bundler, not a direct `node --experimental-
// strip-types` import (a pre-existing condition, unrelated to this fix) -
// so gate 5's wiring is checked as source text rather than by importing
// and calling the functions directly.
async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8")
}

// Regression coverage for docs/reports/acceptance-gate-audit-2026-09-10.md
// gates 3, 5 and 10 - each of these previously had no automated check at
// all, so a future edit could silently regress them without any test
// catching it.

test("gate 3: every governed official source with a review date carries a valid, real-looking date and rule version", () => {
  for (const [country, sources] of Object.entries(officialCountrySources)) {
    for (const source of sources) {
      if (source.reviewedAt === undefined) {
        // Honest gap: no dedicated country-pack review exists yet (e.g.
        // France) - must not be silently backfilled with an invented date.
        assert.equal(
          source.ruleVersion,
          undefined,
          `${country}/${source.label}: reviewedAt is absent but ruleVersion is set - both must be present together or both absent`,
        )
        continue
      }

      assert.match(
        source.reviewedAt,
        /^\d{4}-\d{2}-\d{2}$/,
        `${country}/${source.label}: reviewedAt must be an ISO date`,
      )
      assert.ok(
        source.ruleVersion && source.ruleVersion.trim().length > 0,
        `${country}/${source.label}: a reviewedAt date requires a ruleVersion`,
      )
    }
  }
})

test("gate 3: countries with a dedicated country-pack review (UK, Ireland, Germany, Netherlands) expose freshness on every source", () => {
  for (const country of ["United Kingdom", "Ireland", "Germany", "Netherlands"]) {
    const sources = getOfficialSources(country)
    assert.ok(sources.length > 0, `${country} should have official sources`)
    for (const source of sources) {
      assert.notEqual(
        source.reviewedAt,
        undefined,
        `${country}/${source.label} should carry a reviewedAt date`,
      )
    }
  }
})

test("gate 3: France's sources deliberately carry no freshness metadata, not an invented one", () => {
  for (const source of getOfficialSources("France")) {
    assert.equal(source.reviewedAt, undefined)
    assert.equal(source.ruleVersion, undefined)
  }
})

test("gate 10: identity, work-right and CV/achievement fields are classified high-risk", () => {
  for (const field of [
    "fullName",
    "workRightDetails",
    "sponsorshipNeeded",
    "baseCvText",
    "experienceHighlights",
    "projectSummaries",
  ]) {
    assert.equal(isHighRiskProfileField(field), true, `${field} should be high-risk`)
    assert.ok(getHighRiskProfileFieldReason(field).length > 0)
  }
})

test("gate 10: fields with no material application-claim content are not classified high-risk", () => {
  for (const field of [
    "email",
    "phone",
    "linkedInUrl",
    "githubUrl",
    "portfolioUrl",
    "currentCity",
    "targetRoles",
    "noticePeriod",
  ]) {
    assert.equal(isHighRiskProfileField(field), false, `${field} should not be high-risk`)
  }
})

test("gate 5: a fact correction is tracked when a manually chosen context value differs from the active CV suggestion", async () => {
  const analytics = await read("apps/web/lib/analytics.ts")
  const dashboard = await read("apps/web/components/DashboardExperience.tsx")

  assert.match(analytics, /fact_correction: FactCorrectionProps/)
  assert.match(
    analytics,
    /export function trackFactCorrection\(props: FactCorrectionProps\): void \{\s*captureEvent\("fact_correction", props\)/,
  )

  const updateStart = dashboard.indexOf(
    "const updateProductContext = <K extends keyof ProductContext>",
  )
  const updateEnd = dashboard.indexOf("\n  }", updateStart)
  const updateBody = dashboard.slice(updateStart, updateEnd)

  assert.match(updateBody, /contextSuggestion\[key as keyof ContextSuggestion\] !== value/)
  assert.match(updateBody, /trackFactCorrection\(\{/)
})

test("gate 5: a decision override is tracked when a job is saved despite a non-ready content gate", async () => {
  const analytics = await read("apps/web/lib/analytics.ts")
  const dashboard = await read("apps/web/components/DashboardExperience.tsx")

  assert.match(analytics, /decision_override: DecisionOverrideProps/)
  assert.match(
    analytics,
    /export function trackDecisionOverride\(props: DecisionOverrideProps\): void \{\s*captureEvent\("decision_override", props\)/,
  )

  const saveStart = dashboard.indexOf("const saveApplicationFromJob = async () =>")
  const saveEnd = dashboard.indexOf("const runAiJobAnalysis = async () =>")
  const saveBody = dashboard.slice(saveStart, saveEnd)

  assert.match(saveBody, /evaluationForTracking\.contentGate !== "ready"/)
  assert.match(saveBody, /trackDecisionOverride\(\{/)
})

test("gate 17: kit preparation start and save are tracked with an application id and duration, never document content", async () => {
  const analytics = await read("apps/web/lib/analytics.ts")
  const dashboard = await read("apps/web/components/DashboardExperience.tsx")

  assert.match(analytics, /kit_preparation_started: KitPreparationStartedProps/)
  assert.match(analytics, /kit_preparation_saved: KitPreparationSavedProps/)
  assert.match(
    analytics,
    /export function trackKitPreparationStarted\(\s*props: KitPreparationStartedProps,\s*\): void \{\s*captureEvent\("kit_preparation_started", props\)/,
  )
  assert.match(
    analytics,
    /export function trackKitPreparationSaved\(props: KitPreparationSavedProps\): void \{\s*captureEvent\("kit_preparation_saved", props\)/,
  )
  // The tracked props are an id and a number - never the generated kit text.
  assert.doesNotMatch(analytics, /KitPreparationSavedProps = \{[^}]*coverLetter/)

  const regenerateStart = dashboard.indexOf("const regenerateKitDraft = async () =>")
  const regenerateEnd = dashboard.indexOf("const saveApplicationKitSnapshot = () =>")
  const regenerateBody = dashboard.slice(regenerateStart, regenerateEnd)

  assert.match(regenerateBody, /kitPreparationStartedAtRef\.current\[activeKitApplication\.id\] = Date\.now\(\)/)
  assert.match(regenerateBody, /trackKitPreparationStarted\(\{ applicationId: activeKitApplication\.id \}\)/)

  const saveStart = dashboard.indexOf("const saveApplicationKitSnapshot = () =>")
  const saveEnd = dashboard.indexOf("const copyKitField = async")
  const saveBody = dashboard.slice(saveStart, saveEnd)

  assert.match(saveBody, /trackKitPreparationSaved\(\{/)
  assert.match(saveBody, /durationMs: Date\.now\(\) - preparationStartedAt/)
})
