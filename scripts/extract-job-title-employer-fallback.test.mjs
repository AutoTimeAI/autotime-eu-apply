import assert from "node:assert/strict"
import test from "node:test"
import { extractJob } from "../apps/web/lib/job-application-workflow.ts"

const plainFormatDescription = `Staff Site Reliability Engineer
Helix Dynamics - Amsterdam, Netherlands (Hybrid)

We need a Staff SRE to own our production reliability program.

Requirements:
- 7+ years SRE/infra experience, strong Kubernetes and Terraform
- On-call leadership experience
- EU work authorization required; company can sponsor for exceptional candidates
- Fluent English required

Salary: EUR 90,000 - 110,000. Hybrid, 2 days in office per week.`

test("extractJob infers title/employer from a plain 'title then company - location' paste with no labels", () => {
  const job = extractJob({ description: plainFormatDescription, employer: "", title: "" })
  assert.equal(job.title.value, "Staff Site Reliability Engineer")
  assert.equal(job.employer.value, "Helix Dynamics")
})

test("extractJob still prefers explicit caller-supplied title/employer over the guess", () => {
  const job = extractJob({ description: plainFormatDescription, employer: "Explicit Co", title: "Explicit Title" })
  assert.equal(job.title.value, "Explicit Title")
  assert.equal(job.employer.value, "Explicit Co")
})

test("extractJob still prefers the labelled 'Role:'/'Company:' format when present", () => {
  const labelled = `Role: Backend Engineer\nCompany: Labelled Co\n\n${"x".repeat(80)}`
  const job = extractJob({ description: labelled, employer: "", title: "" })
  assert.equal(job.title.value, "Backend Engineer")
  assert.equal(job.employer.value, "Labelled Co")
})

test("extractJob leaves title blank rather than guessing a long prose first line", () => {
  const prose = `This is a long introductory sentence that reads like prose rather than a job title and should not be guessed as one because it is far too long.\n\nMore description text here to satisfy the length requirement for a valid vacancy paste overall.`
  const job = extractJob({ description: prose, employer: "", title: "" })
  assert.equal(job.title.value, "")
})
