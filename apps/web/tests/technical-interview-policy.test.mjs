import assert from "node:assert/strict"
import test from "node:test"
import { buildTechnicalInterviewContext } from "../domains/interviews/technical-interview-policy.ts"

const profile = {
  baseCvText: "Built REST API integrations on AWS",
  experienceHighlights: "Improved payment monitoring",
  projectSummaries: "Delivered an incident dashboard",
  targetCountries: "Ireland",
  workRightDetails: "",
}
const job = {
  jobDescription: "Design secure APIs with SQL and observability",
  location: "Dublin",
  skills: ["TypeScript"],
  summary: "Cloud platform role",
  workMode: "hybrid",
}

test("combines explicit and inferred technical signals deterministically", () => {
  const result = buildTechnicalInterviewContext({ difficulty: "standard", job, profile })
  assert.deepEqual(result.signals.slice(0, 4), ["TypeScript", "SQL and data modelling", "API integration", "cloud architecture"])
  assert.equal(result.primarySkill, "TypeScript")
  assert.equal(result.timebox, "3 minutes")
})

test("senior preparation adds rollback, failure-mode and measurement expectations", () => {
  const result = buildTechnicalInterviewContext({ difficulty: "senior", job, profile })
  assert.match(result.answerContract.join(" "), /rollback path and success metric/)
  assert.match(result.depth, /failure modes/)
  assert.equal(result.timebox, "6 minutes")
})

test("missing work-right evidence creates a risk check without inventing an answer", () => {
  const result = buildTechnicalInterviewContext({ difficulty: "advanced", job, profile })
  assert.ok(result.riskChecks.some((item) => /work-right/.test(item)))
  assert.ok(result.euContext.some((item) => /EU signal/.test(item)))
})

test("evidence hooks prefer vacancy evidence and remain bounded", () => {
  const result = buildTechnicalInterviewContext({ difficulty: "standard", job, profile })
  assert.match(result.evidenceHook, /^JD signal:/)
  assert.ok(result.evidenceHook.length <= 161)
})
