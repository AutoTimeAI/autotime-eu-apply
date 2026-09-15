import assert from "node:assert/strict"
import test from "node:test"
import { appendGovernedMobilityDecision } from "../platform/application-preparation/mobility-decision-writer.ts"

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
function client(fail = false) {
  const calls = []
  return {
    calls,
    async rpc(name, args) {
      calls.push({ name, args })
      return fail
        ? { data: null, error: { message: "private database detail" } }
        : { data: [{ vacancy_snapshot_id: id(10), decision_record_id: id(11) }], error: null }
    },
  }
}
const input = {
  profile: {
    currentCountry: "Ireland", targetCountries: "Germany", targetRoles: "Platform Engineer",
    workRightDetails: "Requires a German permit", sponsorshipNeeded: true,
    relocationWillingness: "yes", salaryExpectation: "EUR 80000", noticePeriod: "30 days",
    baseCvText: "Private CV evidence", projectSummaries: "Project evidence",
    experienceHighlights: "Experience evidence",
  },
  job: { jobTitle: "Platform Engineer", company: "Example GmbH", location: "Berlin", jobDescription: "Build systems", jobUrl: "https://example.com/jobs/1" },
}
const decision = { decision: "Apply", blockers: [], missingEvidence: [], governance: { readinessSnapshotId: id(1), ruleBundleVersionId: id(2), targetCountry: "Germany", outputPermission: "definitive", readinessState: "approved", reasonCodes: [] } }

test("ungoverned assessments do not create misleading immutable records", async () => {
  const db = client()
  assert.equal(await appendGovernedMobilityDecision({ client: db, userId: id(3), input, decision: { decision: "Apply", blockers: [], missingEvidence: [] } }), null)
  assert.equal(db.calls.length, 0)
})

test("governed assessment appends vacancy, decision, then a replay-input envelope with exact lineage", async () => {
  const db = client()
  const result = await appendGovernedMobilityDecision({ client: db, userId: id(3), input, decision, recordedAt: "2026-09-12T12:00:00.000Z" })
  assert.deepEqual(result, { vacancySnapshotId: id(10), decisionRecordId: id(11) })
  assert.equal(db.calls.length, 1)
  assert.equal(db.calls[0].name, "append_atomic_mobility_decision_receipt")
  assert.equal(db.calls[0].args.p_candidate_facts.length, 11)
  assert.equal(db.calls[0].args.p_decision.ruleBundleVersionId, id(2))
  assert.equal(db.calls[0].args.p_decision.employerState, "not_checked")
  assert.equal(db.calls[0].args.p_decision.canonicalOutput.readinessSnapshotId, id(1))
  assert.match(db.calls[0].args.p_vacancy.contentSha256, /^[a-f0-9]{64}$/)
  assert.match(db.calls[0].args.p_decision.canonicalOutputSha256, /^[a-f0-9]{64}$/)
  assert.deepEqual(db.calls[0].args.p_external_assessment_snapshot_ids, [])
  assert.equal(JSON.stringify(db.calls).includes("Private CV evidence"), false)
})

test("external replay-input references are recorded verbatim", async () => {
  const db = client()
  await appendGovernedMobilityDecision({
    client: db, userId: id(3), input, decision,
    replayInputs: { externalAssessmentSnapshotIds: [id(30)] },
  })
  assert.deepEqual(db.calls[0].args.p_external_assessment_snapshot_ids, [id(30)])
})

test("canonical decision hash ignores blocker and missing-evidence ordering", async () => {
  const first = client(); const second = client()
  await appendGovernedMobilityDecision({ client: first, userId: id(3), input, decision: { ...decision, blockers: ["b", "a"], missingEvidence: ["y", "x"] } })
  await appendGovernedMobilityDecision({ client: second, userId: id(3), input, decision: { ...decision, blockers: ["a", "b"], missingEvidence: ["x", "y"] } })
  assert.equal(first.calls[0].args.p_decision.canonicalOutputSha256, second.calls[0].args.p_decision.canonicalOutputSha256)
})

test("write failures are redacted", async () => {
  await assert.rejects(appendGovernedMobilityDecision({ client: client(true), userId: id(3), input, decision }), /^Error: Governed mobility decision receipt could not be recorded$/)
})

test("the entire governed receipt uses one database call", async () => {
  const db = client()
  await appendGovernedMobilityDecision({ client: db, userId: id(3), input, decision })
  assert.equal(db.calls.length, 1)
})
