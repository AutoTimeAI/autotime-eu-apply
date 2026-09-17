import assert from "node:assert/strict"
import test from "node:test"
import { assessApplicationDecision } from "../apps/web/platform/application-preparation/decision-adapter.ts"

// Regression coverage for the LandWell validation pilot's decision-recording
// flag (docs/reference/landwell-master-execution-plan.md §4). The whole
// point of splitting MOBILITY_DECISION_RECORDING_ENABLED from
// MOBILITY_GOVERNANCE_ENFORCEMENT_ENABLED is that recording must never be
// able to change what a real candidate sees - these tests assert that
// property directly, not just that recording "works".

const baseProfile = () => ({
  fullName: "",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "",
  currentCity: "",
  targetCountries: "Ireland",
  targetRoles: "Business Analyst",
  workRightDetails: "",
  sponsorshipNeeded: true,
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

function recordingClientReturning(ruleBundleVersionId) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: ruleBundleVersionId ? { id: ruleBundleVersionId } : null,
              error: null,
            }),
          }),
        }),
      }),
    }),
  }
}

test("recording is a no-op (no governance attached) when the pilot rule bundle isn't seeded yet", async () => {
  const input = { profile: baseProfile(), job: baseJob(), reusableAnswers: null }
  const withoutRecording = await assessApplicationDecision(input)
  const withRecordingButNoBundle = await assessApplicationDecision(
    input,
    undefined,
    undefined,
    recordingClientReturning(null),
  )

  assert.deepEqual(withRecordingButNoBundle.decision, withoutRecording.decision)
  assert.deepEqual(withRecordingButNoBundle.blockers, withoutRecording.blockers)
  assert.equal(withRecordingButNoBundle.governance, undefined)
})

test("recording attaches pilot governance metadata without changing the decision or blockers", async () => {
  const input = { profile: baseProfile(), job: baseJob(), reusableAnswers: null }
  const withoutRecording = await assessApplicationDecision(input)
  const withRecording = await assessApplicationDecision(
    input,
    undefined,
    undefined,
    recordingClientReturning("11111111-1111-1111-1111-111111111111"),
  )

  assert.equal(withRecording.decision, withoutRecording.decision)
  assert.deepEqual(withRecording.blockers, withoutRecording.blockers)
  assert.deepEqual(withRecording.missingEvidence, withoutRecording.missingEvidence)

  assert.ok(withRecording.governance, "expected pilot governance metadata to be attached")
  assert.equal(withRecording.governance.readinessSnapshotId, null, "observation records must not invent a readiness snapshot")
  assert.equal(withRecording.governance.ruleBundleVersionId, "11111111-1111-1111-1111-111111111111")
  assert.equal(withRecording.governance.outputPermission, "information_only")
  assert.deepEqual(withRecording.governance.reasonCodes, ["PILOT_OBSERVATION_RECORDING"])
})

test("a native candidate (mobility check not applicable) is never touched by the recording client", async () => {
  const input = {
    profile: { ...baseProfile(), sponsorshipNeeded: false },
    job: baseJob(),
    reusableAnswers: null,
  }
  const result = await assessApplicationDecision(
    input,
    undefined,
    undefined,
    recordingClientReturning("11111111-1111-1111-1111-111111111111"),
  )

  assert.equal(result.governance, undefined)
})
