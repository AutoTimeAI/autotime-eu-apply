import assert from "node:assert/strict"
import test from "node:test"
import { recordExternalAssessmentSnapshot } from "../platform/mobility-external-assessment/writer.ts"

function client(fail) {
  const writes = []
  return {
    writes,
    from(table) {
      return { insert(value) {
        writes.push({ table, value })
        return { select() { return { async single() {
          return fail ? { data: null, error: { message: "db down" } } : { data: { id: "snapshot-1" }, error: null }
        } } } }
      } }
    },
  }
}

test("records provider, endpoint and hashed request/response, not raw text", async () => {
  const db = client()
  const result = await recordExternalAssessmentSnapshot({
    client: db, provider: "stamp4", endpoint: "/api/stamp4/simple-apply/sponsorship-check",
    request: { roleTitle: "Engineer", rawText: "candidate identifying text" },
    response: { status: "eligible", pathway: "Skilled Worker", occupationCode: "2136", occupationConfidence: "high" },
    httpStatus: 200, covered: true,
  })
  assert.deepEqual(result, { snapshotId: "snapshot-1" })
  const write = db.writes[0]
  assert.equal(write.table, "mobility_external_assessment_snapshots")
  assert.match(write.value.request_sha256, /^[a-f0-9]{64}$/)
  assert.match(write.value.response_sha256, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(write.value).includes("candidate identifying text"), false)
  assert.equal(write.value.covered, true)
  assert.deepEqual(write.value.assessment, { status: "eligible", pathway: "Skilled Worker", occupationCode: "2136", occupationConfidence: "high" })
})

test("uncovered checks are recorded with no assessment payload", async () => {
  const db = client()
  await recordExternalAssessmentSnapshot({
    client: db, provider: "stamp4", endpoint: "/api/stamp4/simple-apply/sponsorship-check",
    request: { roleTitle: "Engineer" }, response: null, httpStatus: 502, covered: false,
  })
  assert.equal(db.writes[0].value.assessment, null)
})

test("write failures return null rather than throwing", async () => {
  const db = client(true)
  const result = await recordExternalAssessmentSnapshot({
    client: db, provider: "stamp4", endpoint: "/x", request: {}, response: null, httpStatus: 502, covered: true,
  })
  assert.equal(result, null)
})
