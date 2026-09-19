import assert from "node:assert/strict"
import { __setOpenAIClientForTesting, draftOutreachWithOpenAI, OutreachDraftValidationError } from "../lib/openai-server.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function mockOpenAI(responseValue) {
  __setOpenAIClientForTesting({
    responses: {
      async create() {
        return { output_text: JSON.stringify(responseValue), usage: { input_tokens: 10, output_tokens: 10 } }
      },
    },
  })
}

function resetOpenAI() {
  __setOpenAIClientForTesting(null)
}

const baseContext = {
  channel: "email",
  contactType: "recruiter",
  jobTitle: "Backend Engineer",
  companyName: "Example Payments",
  jobDescription: "Backend role using TypeScript and PostgreSQL.",
  recruiterName: "Alex",
  recruiterRole: "Recruiter",
  candidateSummary: "Backend engineer with TypeScript and PostgreSQL experience.",
  candidateKeyStrengths: ["TypeScript", "PostgreSQL"],
}

test("throws OutreachDraftValidationError (not a plain Error) when a LinkedIn note exceeds 300 characters", async () => {
  // The route's status mapping relies on `instanceof OutreachDraftValidationError`
  // specifically to map this to a 4xx and let the safe message pass through
  // toPublicApiError unredacted - a plain Error here would fall through to
  // the generic 500 branch and lose this message.
  mockOpenAI({ subject: null, body: "x".repeat(301) })
  try {
    await assert.rejects(
      () => draftOutreachWithOpenAI({ ...baseContext, channel: "linkedin_note" }),
      OutreachDraftValidationError,
    )
  } finally {
    resetOpenAI()
  }
})

test("throws OutreachDraftValidationError when a non-LinkedIn draft exceeds 150 words", async () => {
  mockOpenAI({ subject: "Hello", body: Array.from({ length: 151 }, () => "word").join(" ") })
  try {
    await assert.rejects(() => draftOutreachWithOpenAI(baseContext), OutreachDraftValidationError)
  } finally {
    resetOpenAI()
  }
})

test("throws OutreachDraftValidationError when the subject exceeds 60 characters", async () => {
  mockOpenAI({ subject: "s".repeat(61), body: "Short body." })
  try {
    await assert.rejects(() => draftOutreachWithOpenAI(baseContext), OutreachDraftValidationError)
  } finally {
    resetOpenAI()
  }
})

let failed = 0

for (const { name, run } of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed += 1
    console.error(`not ok - ${name}`)
    console.error(error)
  }
}

if (failed > 0) {
  process.exitCode = 1
}
