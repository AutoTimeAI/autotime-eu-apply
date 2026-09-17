import assert from "node:assert/strict"
import test from "node:test"
import { assessCoreLoopTrace } from "../apps/web/domains/core-loop/traceability.ts"
import {
  analyseJob,
  createApplication,
  extractJob,
} from "../apps/web/lib/job-application-workflow.ts"
import { createInterview } from "../apps/web/lib/interview-workflow.ts"

const description = `Job title: Backend Engineer
Company: Example Payments
Location: Dublin, Ireland
Salary EUR 75,000. Permanent hybrid role.
Required TypeScript and Node.js experience.
Essential PostgreSQL and secure API experience.`
const evidence =
  "Six years building TypeScript, Node.js, PostgreSQL and secure API services."

function decidedJob() {
  const job = extractJob({ description })
  return {
    ...job,
    analysisHistory: [analyseJob(job, evidence)],
    analysisState: "Analysed",
  }
}

test("a valid role trace progresses from decision through application review", () => {
  const job = decidedJob()
  const application = {
    ...createApplication(job),
    consequentialAnswersReviewed: true,
    evidenceConfirmed: true,
    status: "Ready",
  }

  assert.deepEqual(assessCoreLoopTrace({ job }).stage, "decided")
  const result = assessCoreLoopTrace({ application, job })
  assert.equal(result.valid, true)
  assert.equal(result.roleId, job.id)
  assert.equal(result.stage, "approved")
})

test("the trace rejects approval without a retained decision and evidence review", () => {
  const job = extractJob({ description })
  const application = { ...createApplication(job), status: "Ready" }
  const result = assessCoreLoopTrace({ application, job })

  assert.equal(result.valid, false)
  assert.deepEqual(result.issueCodes, [
    "application-without-decision",
    "approved-without-evidence-review",
  ])
})

test("the trace rejects an interview linked across role or application boundaries", () => {
  const job = decidedJob()
  const application = {
    ...createApplication(job),
    consequentialAnswersReviewed: true,
    evidenceConfirmed: true,
    status: "Applied",
    submissionConfirmed: true,
    appliedAt: "2026-09-10T12:00:00.000Z",
  }
  const interview = createInterview({
    application,
    format: "video",
    job,
    stage: "technical",
    userId: "user-1",
  })
  const result = assessCoreLoopTrace({
    application,
    job,
    interviews: [{ ...interview, applicationId: "another-application" }],
  })

  assert.equal(result.valid, false)
  assert.deepEqual(result.issueCodes, ["interview-application-mismatch"])
})
