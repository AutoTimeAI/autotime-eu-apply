import assert from "node:assert/strict"
import test from "node:test"
import { assessApplicationDecision } from "../apps/web/platform/application-preparation/decision-adapter.ts"

const baseProfile = () => ({
  fullName: "", email: "", phone: "", linkedInUrl: "", githubUrl: "", portfolioUrl: "",
  currentCountry: "", currentCity: "", targetCountries: "Germany", targetRoles: "Engineer",
  workRightDetails: "Needs sponsorship", sponsorshipNeeded: true, relocationWillingness: "yes",
  salaryExpectation: "", noticePeriod: "", baseCvText: "Led delivery of a payments migration.",
  projectSummaries: "", experienceHighlights: "",
})
const baseJob = () => ({
  jobTitle: "Engineer", company: "Acme", jobUrl: "https://example.com/job/1", location: "Germany",
  workMode: "remote", jobDescription: "Sponsorship available for the right candidate.", notes: "",
})

function snapshotClient() {
  const writes = []
  return {
    writes,
    from(table) {
      return { insert(value) {
        writes.push({ table, value })
        return { select() { return { async single() { return { data: { id: "snap-1" }, error: null } } } } }
      } }
    },
  }
}

test("an integrated Stamp4 assessment is recorded as a replay-input snapshot", async () => {
  const snapClient = snapshotClient()
  const result = await assessApplicationDecision(
    { profile: baseProfile(), job: baseJob(), reusableAnswers: null },
    undefined,
    snapClient,
  )

  assert.equal(snapClient.writes.length, 1)
  assert.equal(snapClient.writes[0].table, "mobility_external_assessment_snapshots")
  assert.equal(snapClient.writes[0].value.provider, "autotime-stamp4-integrated")
  assert.equal(snapClient.writes[0].value.assessment.rulesetVersion, "stamp4-import-2026.09.15")
  assert.equal(snapClient.writes[0].value.covered, true)
  assert.deepEqual(result.replayInputs, { externalAssessmentSnapshotIds: ["snap-1"] })
})

test("no snapshot client means no write and no replayInputs field, without affecting the decision", async () => {
  const result = await assessApplicationDecision(
    { profile: baseProfile(), job: baseJob(), reusableAnswers: null },
  )
  assert.equal(result.replayInputs, undefined)
})
