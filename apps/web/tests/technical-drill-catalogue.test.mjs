import assert from "node:assert/strict"
import test from "node:test"
import { createTechnicalInterviewDrills } from "../domains/interviews/technical-drill-catalogue.ts"

const profile = {
  baseCvText: "Built secure TypeScript APIs",
  experienceHighlights: "Improved service reliability",
  projectSummaries: "Delivered a payments integration",
  targetCountries: "Ireland",
  targetRoles: "Platform Engineer",
  workRightDetails: "Permission confirmed",
}
const job = {
  company: "Example Employer",
  jobDescription: "TypeScript API and cloud platform delivery",
  jobTitle: "Platform Engineer",
  location: "Dublin",
  skills: ["TypeScript"],
  summary: "Build reliable services",
  workMode: "hybrid",
}

for (const focus of ["systems", "debugging", "api", "data", "delivery"]) {
  test(`${focus} catalogue produces two complete and stable drills`, () => {
    const drills = createTechnicalInterviewDrills({ difficulty: "advanced", focus, job, profile })
    assert.equal(drills.length, 2)
    assert.equal(new Set(drills.map((drill) => drill.id)).size, 2)
    for (const drill of drills) {
      assert.match(drill.id, /-advanced-[01]$/)
      assert.ok(drill.question.length > 40)
      assert.ok(drill.expectedSignals.length >= 3)
      assert.ok(drill.followUps.length >= 3)
      assert.ok(drill.answerContract.length >= 4)
      assert.ok(drill.riskChecks.length >= 3)
    }
  })
}
