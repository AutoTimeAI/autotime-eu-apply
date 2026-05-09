import assert from "node:assert/strict"
import {
  canUseWebAI,
  createLocalInterviewPrepPack,
  defaultWebAISettings,
  estimateOpenAIInterviewCostUsd,
  generateAIInterviewPrepPack,
  getInterviewPrepGuardrails,
  normalizeAIInterviewPrepPack
} from "../lib/interview-prep.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

const profile = {
  fullName: "Rajan Kumar",
  email: "rajan@example.com",
  phone: "+447700900000",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "London",
  targetCountries: "United Kingdom, Ireland",
  targetRoles: "Business Analyst",
  workRightDetails: "UK work authorisation",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "Negotiable",
  noticePeriod: "1 month",
  baseCvText: "Business analyst with payments and UAT experience.",
  projectSummaries: "AutoTime EU Apply project.",
  experienceHighlights: "Requirements analysis and stakeholder management."
}

const reusableAnswers = {
  sponsorshipAnswer: "I do not require sponsorship.",
  relocationAnswer: "I can discuss relocation.",
  workAuthorisationAnswer: "I am authorised to work in the UK.",
  noticePeriodAnswer: "My notice period is one month.",
  salaryExpectationAnswer: "Negotiable.",
  motivationAnswer: "I am motivated by useful systems delivery.",
  strengthsAnswer: "Requirements analysis and UAT are my strengths.",
  availabilityAnswer: "I am available next week."
}

const job = {
  jobTitle: "Business Systems Analyst",
  company: "Example Bank",
  jobUrl: "https://example.com/jobs/123",
  location: "London, United Kingdom",
  workMode: "hybrid",
  jobDescription: "Payments requirements and UAT role.",
  notes: "Imported from extension.",
  skills: ["Payments", "UAT", "SQL"],
  fitScore: 85,
  recommendation: "High Priority",
  positioningAngle: "Position around payments systems delivery.",
  summary: "Strong match for business systems analysis.",
  gaps: ["Confirm exact reporting stack."]
}

const application = {
  id: "app-1",
  title: "Business Systems Analyst",
  roleTitle: "Business Systems Analyst",
  company: "Example Bank",
  url: "https://example.com/jobs/123",
  source: "example.com",
  createdAt: "2026-05-04T09:00:00.000Z",
  status: "Interview",
  nextAction: "Prepare",
  notes: "Recruiter screen booked."
}

const fallbackPack = createLocalInterviewPrepPack(application, profile, job, {
  id: "prep-1",
  now: "2026-05-04T10:00:00.000Z"
})

test("creates local interview prep pack without AI", () => {
  assert.equal(fallbackPack.id, "prep-1")
  assert.equal(fallbackPack.applicationId, "app-1")
  assert.match(fallbackPack.roleSummary, /Business Systems Analyst/)
  assert.ok(fallbackPack.likelyQuestions.length >= 5)
  assert.deepEqual(fallbackPack.skillsToRevise, ["Payments", "UAT", "SQL"])
  assert.ok(
    fallbackPack.projectTalkingPoints.every((item) => !item.includes("FinTech"))
  )
  assert.ok(
    fallbackPack.finalPrepChecklist.some((item) =>
      item.includes("General career preparation only")
    )
  )
})

test("blocks interview prep when evidence is too thin", () => {
  const thinProfile = {
    ...profile,
    baseCvText: "",
    projectSummaries: "",
    experienceHighlights: "",
    workRightDetails: ""
  }
  const thinJob = {
    ...job,
    jobDescription: "",
    summary: "",
    positioningAngle: "",
    skills: []
  }
  const draftApplication = {
    ...application,
    status: "Saved",
    notes: ""
  }
  const guardrails = getInterviewPrepGuardrails({
    application: draftApplication,
    profile: thinProfile,
    job: thinJob
  })

  assert.equal(guardrails.ready, false)
  assert.ok(guardrails.blockers.length >= 3)
  assert.throws(
    () => createLocalInterviewPrepPack(draftApplication, thinProfile, thinJob),
    /Interview prep blocked/
  )
})

test("normalizes partial AI interview prep output", () => {
  const normalized = normalizeAIInterviewPrepPack(
    {
      roleSummary: "AI role summary.",
      likelyQuestions: ["Question one?", 123, "Question two?"],
      starAnswerPrompts: "not an array",
      skillsToRevise: ["Payments"]
    },
    fallbackPack,
    { id: "prep-ai", now: "2026-05-04T11:00:00.000Z" }
  )

  assert.equal(normalized.id, "prep-ai")
  assert.equal(normalized.applicationId, "app-1")
  assert.equal(normalized.roleSummary, "AI role summary.")
  assert.equal(normalized.positioningStatement, fallbackPack.positioningStatement)
  assert.deepEqual(normalized.likelyQuestions, [
    "Question one?",
    "Question two?"
  ])
  assert.deepEqual(normalized.starAnswerPrompts, [])
  assert.deepEqual(normalized.skillsToRevise, ["Payments"])
  assert.equal(normalized.createdAt, fallbackPack.createdAt)
  assert.equal(normalized.updatedAt, "2026-05-04T11:00:00.000Z")
})

test("estimates interview prep OpenAI usage cost", () => {
  assert.equal(
    estimateOpenAIInterviewCostUsd("gpt-4.1-mini", {
      input_tokens: 1000,
      output_tokens: 500
    }),
    0.0012
  )
})

test("checks web AI budget and key availability", () => {
  assert.equal(canUseWebAI(defaultWebAISettings), false)
  assert.equal(
    canUseWebAI({
      apiKey: "sk-test",
      model: "gpt-4.1-mini",
      monthlyBudgetUsd: 1,
      usedBudgetUsd: 0.99
    }),
    true
  )
  assert.equal(
    canUseWebAI({
      apiKey: "sk-test",
      model: "gpt-4.1-mini",
      monthlyBudgetUsd: 1,
      usedBudgetUsd: 1
    }),
    false
  )
})

test("generates AI interview prep from mocked OpenAI response", async () => {
  const result = await generateAIInterviewPrepPack({
    settings: {
      apiKey: "sk-test",
      model: "gpt-4.1-mini",
      monthlyBudgetUsd: 2,
      usedBudgetUsd: 0
    },
    application,
    profile,
    reusableAnswers,
    job,
    fallbackPack,
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          output_text: JSON.stringify({
            roleSummary: "AI summary.",
            positioningStatement: "AI positioning.",
            fitAndGapRecap: "AI recap.",
            likelyQuestions: ["Why this company?"],
            starAnswerPrompts: ["Use a UAT story."],
            projectTalkingPoints: ["Discuss AutoTime."],
            skillsToRevise: ["SQL"],
            questionsToAskEmployer: ["What does success look like?"],
            finalPrepChecklist: ["Review job notes."]
          }),
          usage: {
            input_tokens: 1000,
            output_tokens: 500
          }
        }
      }
    })
  })

  assert.equal(result.value.roleSummary, "AI summary.")
  assert.deepEqual(result.value.likelyQuestions, ["Why this company?"])
  assert.equal(result.approximateCostUsd, 0.0012)
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
