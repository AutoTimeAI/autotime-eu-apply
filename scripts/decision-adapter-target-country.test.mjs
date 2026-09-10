import assert from "node:assert/strict"
import test from "node:test"
import { assessApplicationDecision } from "../apps/web/platform/application-preparation/decision-adapter.ts"

// Regression coverage for acceptance-gate-audit-2026-09-10.md gate 1: the
// decision-adapter used to default a missing target country to "European
// Union" and run a full country-specific mobility assessment against that
// fabricated jurisdiction. It must now report "Insufficient evidence"
// instead of inventing a country.

const baseProfile = () => ({
  fullName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "",
  currentCity: "",
  targetCountries: "",
  targetRoles: "Business Analyst",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "",
  baseCvText: "Led delivery of a payments migration.",
  projectSummaries: "",
  experienceHighlights: "",
})

const baseJob = () => ({
  jobTitle: "Business Analyst",
  company: "Acme",
  jobUrl: "https://example.com/job/1",
  location: "",
  workMode: "remote",
  jobDescription: "Own requirements and delivery for a payments platform.",
  notes: "",
})

test("a foreign-candidate with no target country anywhere gets Insufficient evidence, not a fabricated country", async () => {
  const result = await assessApplicationDecision({
    profile: { ...baseProfile(), sponsorshipNeeded: true },
    job: baseJob(),
    reusableAnswers: null,
  })

  assert.equal(result.decision, "Insufficient evidence")
  assert.ok(
    result.missingEvidence.includes("target country for mobility assessment"),
    `expected missingEvidence to flag the target country, got: ${result.missingEvidence.join(", ")}`,
  )
})

test("a foreign-candidate with a real target country still gets a full mobility assessment", async () => {
  const result = await assessApplicationDecision({
    profile: { ...baseProfile(), sponsorshipNeeded: true, targetCountries: "Ireland" },
    job: baseJob(),
    reusableAnswers: null,
  })

  assert.notEqual(result.decision, "Insufficient evidence")
  assert.ok(
    !result.missingEvidence.includes("target country for mobility assessment"),
    "a real target country should not be reported as missing",
  )
})

test("a foreign-candidate can supply the target country via context instead of the profile", async () => {
  const result = await assessApplicationDecision({
    profile: { ...baseProfile(), sponsorshipNeeded: true },
    job: baseJob(),
    reusableAnswers: null,
    context: { candidatePosition: "foreign-candidate", targetCountry: "Germany" },
  })

  assert.notEqual(result.decision, "Insufficient evidence")
})

test("a native candidate is unaffected by the missing target country - the mobility check does not apply", async () => {
  const result = await assessApplicationDecision({
    profile: { ...baseProfile(), sponsorshipNeeded: false },
    job: baseJob(),
    reusableAnswers: null,
  })

  assert.notEqual(result.decision, "Insufficient evidence")
  assert.ok(
    !result.missingEvidence.includes("target country for mobility assessment"),
  )
})

test("job location is used as a fallback target country when the profile has none", async () => {
  const result = await assessApplicationDecision({
    profile: { ...baseProfile(), sponsorshipNeeded: true },
    job: { ...baseJob(), location: "Netherlands" },
    reusableAnswers: null,
  })

  assert.notEqual(result.decision, "Insufficient evidence")
})
