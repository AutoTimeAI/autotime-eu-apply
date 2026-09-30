import assert from "node:assert/strict"
import test from "node:test"
import {
  evaluateAutoTimeFitScore,
  evaluateCountryFit
} from "../packages/shared/src/fit-model.ts"
import { getTrackedRecommendation } from "../packages/shared/src/eu-fit/decision-policy.ts"
import {
  evaluateJobDecision,
  resolveInternationalRequirement,
  toCountryFitDecision
} from "../packages/shared/src/international/job-decision.ts"

const emptyProfile = {
  fullName: "Test Candidate",
  email: "test@example.com",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "London",
  targetCountries: "",
  targetRoles: "",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "yes",
  salaryExpectation: "",
  noticePeriod: "",
  baseCvText: "",
  projectSummaries: "",
  experienceHighlights: ""
}

const emptyJob = {
  jobTitle: "",
  company: "Example Co",
  jobUrl: "",
  location: "",
  workMode: "unknown",
  jobDescription: "",
  notes: "",
  skills: [],
  seniority: "",
  summary: "",
  gaps: [],
  fitScore: 0,
  recommendation: "Worth Applying",
  positioningAngle: "",
  scoreFactors: []
}

const baCv =
  "Business analyst, 6 years fintech payments. SQL, API, UAT, stakeholder management, requirements, agile delivery, reporting, data analysis. ".repeat(
    4
  )

function decide(profile, job, context) {
  const p = { ...emptyProfile, ...profile }
  const j = { ...emptyJob, ...job }
  const fit = evaluateAutoTimeFitScore({ profile: p, job: j })
  return {
    fit,
    legacy: evaluateCountryFit({ profile: p, job: j, context }),
    result: evaluateJobDecision({ profile: p, job: j, fit, context })
  }
}

test("low role fit can no longer open the content gate (scenario A)", () => {
  const { fit, legacy, result } = decide(
    {
      baseCvText:
        "Retail store supervisor managing rotas and customer service in shops. ".repeat(8),
      targetRoles: "Store Manager",
      workRightDetails: "Irish citizen",
      targetCountries: "Ireland"
    },
    {
      jobTitle: "Senior Data Engineer",
      location: "Dublin, Ireland",
      jobDescription:
        "Senior data engineer: python, spark, kafka, data pipelines, cloud, api, sql.",
      skills: ["python", "spark", "kafka", "airflow"],
      workMode: "hybrid"
    },
    { candidatePosition: "native-candidate", targetCountry: "Ireland" }
  )

  assert.ok(fit.fitScore < 50, `expected low fit, got ${fit.fitScore}`)
  assert.equal(legacy.decision, "Stretch application") // the old, wrong answer
  assert.equal(result.evaluation.decision, "Skip for now")
  assert.equal(result.evaluation.contentGate, "blocked")
})

test("unconfirmed sponsorship no longer averages up to Apply now (scenario B)", () => {
  const { fit, legacy, result } = decide(
    {
      baseCvText: baCv,
      targetRoles: "Business Analyst",
      workRightDetails: "UK resident, will need a permit",
      targetCountries: "Netherlands",
      sponsorshipNeeded: true
    },
    {
      jobTitle: "Business Analyst",
      location: "Amsterdam, Netherlands",
      jobDescription:
        "Business analyst for payments fintech. requirements, stakeholder, uat, sql, api, agile, reporting, data.",
      skills: ["sql", "uat", "api"],
      workMode: "hybrid"
    },
    { candidatePosition: "foreign-candidate", targetCountry: "Netherlands" }
  )

  assert.ok(fit.fitScore >= 80)
  assert.equal(legacy.decision, "Apply now") // the old, wrong answer
  assert.equal(result.combined.decision, "Investigate first")
  assert.equal(result.evaluation.decision, "Improve profile first")
  assert.equal(result.evaluation.contentGate, "blocked")
  assert.equal(result.evaluation.nextBestAction, result.combined.nextAction)
  assert.ok(
    result.evaluation.evidenceChecklist.some((item) => item.startsWith("Verify: "))
  )
})

test("explicit no-sponsorship wording still skips, with the vacancy blocker surfaced", () => {
  const { result } = decide(
    {
      baseCvText: baCv,
      targetRoles: "Business Analyst",
      workRightDetails: "UK resident, will need a permit",
      targetCountries: "Netherlands",
      sponsorshipNeeded: true
    },
    {
      jobTitle: "Business Analyst",
      location: "Amsterdam, Netherlands",
      jobDescription:
        "Business analyst for payments fintech. requirements, stakeholder, uat, sql, api. We are unable to provide visa sponsorship.",
      skills: ["sql", "uat", "api"],
      workMode: "hybrid"
    },
    { candidatePosition: "foreign-candidate", targetCountry: "Netherlands" }
  )

  assert.equal(result.evaluation.decision, "Skip for now")
  assert.ok(
    result.evaluation.blockers.some((item) =>
      item.includes("sponsorship or new work permission is not available")
    )
  )
})

test("a clean native case is not made stricter than the legacy decision", () => {
  const { legacy, result } = decide(
    {
      baseCvText: baCv,
      targetRoles: "Business Analyst",
      workRightDetails: "UK citizen, no sponsorship required",
      targetCountries: "United Kingdom"
    },
    {
      jobTitle: "Business Analyst",
      location: "London, United Kingdom",
      jobDescription:
        "Business analyst for payments fintech. requirements, stakeholder, uat, sql, api, agile, reporting, data.",
      skills: ["sql", "uat", "api"],
      workMode: "hybrid"
    },
    { candidatePosition: "native-candidate", targetCountry: "United Kingdom" }
  )

  assert.equal(result.international, undefined)
  assert.equal(result.evaluation.decision, legacy.decision)
  assert.equal(result.evaluation.decision, "Apply now")
})

test("'international' and 'leadership' are no longer read as seniority signals", () => {
  const profile = {
    ...emptyProfile,
    baseCvText: baCv,
    targetRoles: "Business Analyst",
    workRightDetails: "UK citizen"
  }
  const review = evaluateAutoTimeFitScore({
    profile,
    job: {
      ...emptyJob,
      jobTitle: "Business Analyst",
      jobDescription:
        "Join our international payments team. Show leadership in requirements and UAT."
    }
  })
  const seniority = review.scoreBreakdown.find(
    (item) => item.key === "experienceSeniorityMatch"
  )

  assert.match(seniority.rationale, /No clear seniority requirement/)
  assert.ok(!review.riskAreas.some((item) => item.startsWith("Seniority mismatch")))
})

test("'ai' inside ordinary words no longer counts as a domain match", () => {
  const review = evaluateAutoTimeFitScore({
    profile: {
      ...emptyProfile,
      baseCvText: "Maintained email templates with attention to detail. ".repeat(5)
    },
    job: {
      ...emptyJob,
      jobTitle: "Coordinator",
      jobDescription: "Maintain the email inbox and detail tracker."
    }
  })

  assert.ok(!review.matchedSignals.includes("Domain: ai"))
})

test("tracked recommendation never ranks a gated job above a stretch", () => {
  assert.equal(getTrackedRecommendation("Improve profile first", 90), "Skip")
  assert.equal(getTrackedRecommendation("Skip for now", 90), "Skip")
  assert.equal(getTrackedRecommendation("Stretch application", 90), "Stretch")
  assert.equal(getTrackedRecommendation("Apply now", 85), "High Priority")
  assert.equal(getTrackedRecommendation("Apply now", 70), "Worth Applying")
})

test("Apply now with a low fit score is capped by the score", () => {
  // Guards getTrackedRecommendation itself, not just evaluateJobDecision's
  // "Apply now" implies fit >= 65 invariant - a caller passing a raw
  // evaluateCountryFit decision alongside an unrelated fit score must not
  // get an inflated recommendation back.
  assert.equal(getTrackedRecommendation("Apply now", 55), "Stretch")
  assert.equal(getTrackedRecommendation("Apply now", 40), "Skip")
})

test("international requirement: explicit position wins, unsure defaults to required", () => {
  const unsure = { sponsorshipNeeded: false, workRightDetails: "" }
  const stated = { sponsorshipNeeded: false, workRightDetails: "Irish citizen" }

  assert.equal(resolveInternationalRequirement({ profile: unsure }), "required")
  assert.equal(resolveInternationalRequirement({ profile: stated }), "not-relevant")
  assert.equal(
    resolveInternationalRequirement({
      candidatePosition: "native-candidate",
      profile: unsure
    }),
    "not-relevant"
  )
  assert.equal(
    resolveInternationalRequirement({
      candidatePosition: "native-candidate",
      profile: { ...unsure, sponsorshipNeeded: true }
    }),
    "required"
  )
})

test("orchestrator vocabulary maps onto the persisted legacy vocabulary", () => {
  assert.equal(toCountryFitDecision("Apply"), "Apply now")
  assert.equal(toCountryFitDecision("Stretch application"), "Stretch application")
  assert.equal(toCountryFitDecision("Skip"), "Skip for now")
  assert.equal(toCountryFitDecision("Investigate first"), "Improve profile first")
  assert.equal(toCountryFitDecision("Insufficient evidence"), "Improve profile first")
})
