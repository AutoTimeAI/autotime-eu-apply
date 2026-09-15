import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { candidateDecisionFacts } from "../apps/web/platform/application-preparation/mobility-decision-writer.ts"

const profile = {
  fullName: "Private Person", email: "private@example.com", phone: "123",
  linkedInUrl: "https://linkedin.example/private", githubUrl: "", portfolioUrl: "",
  currentCountry: "Ireland", currentCity: "Dublin", targetCountries: "Germany",
  targetRoles: "Platform Engineer", workRightDetails: "Permit required",
  sponsorshipNeeded: true, relocationWillingness: "yes", salaryExpectation: "80000",
  noticePeriod: "30 days", baseCvText: "Private CV", projectSummaries: "Projects",
  experienceHighlights: "Experience",
}

test("candidate decision provenance covers decision inputs but excludes identity and contact data", () => {
  const facts = candidateDecisionFacts({ profile, job: {}, reusableAnswers: null })
  const subjects = facts.map((fact) => fact.subject)
  assert.deepEqual(subjects, [
    "current_country", "target_countries", "target_roles", "work_right_details",
    "sponsorship_needed", "relocation_willingness", "salary_expectation",
    "notice_period", "base_cv", "project_summaries", "experience_highlights",
  ])
  const serialized = JSON.stringify(facts)
  assert.doesNotMatch(serialized, /Private Person|private@example\.com|linkedin\.example|123/)
})

test("the lineage endpoint loads candidate versions referenced by the immutable replay envelope", () => {
  const source = fs.readFileSync("apps/web/app/api/mobility/decisions/[decisionId]/route.ts", "utf8")
  assert.match(source, /mobility_decision_replay_inputs/)
  assert.match(source, /replayCandidateIds/)
  assert.match(source, /mobility_candidate_evidence_versions/)
  assert.match(source, /replayInputs: replayInputs\.data/)
})
