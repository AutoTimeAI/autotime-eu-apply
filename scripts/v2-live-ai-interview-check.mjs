import assert from "node:assert/strict"
import {
  canUseWebAI,
  createLocalInterviewPrepPack,
  defaultWebAISettings,
  generateAIInterviewPrepPack
} from "../apps/web/lib/interview-prep.ts"

const apiKey = process.env.OPENAI_API_KEY ?? ""
const model = process.env.OPENAI_INTERVIEW_MODEL ?? defaultWebAISettings.model

const profile = {
  fullName: "Rajan",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "London",
  targetCountries: "United Kingdom, Ireland, Netherlands, Germany",
  targetRoles: "Business Analyst, Systems Analyst, Application Support Analyst",
  workRightDetails: "Founder validation test profile; no sensitive live data.",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "Negotiable",
  baseCvText:
    "Business analyst experience across requirements, UAT, stakeholder coordination, SQL reporting and operational support.",
  projectSummaries:
    "AutoTime EU Apply MVP: job analysis, application tracking, content generation and interview prep.",
  experienceHighlights:
    "Requirements clarification, stakeholder management, UAT coordination and support process improvement."
}

const reusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "My notice period is negotiable.",
  salaryExpectationAnswer: "",
  motivationAnswer:
    "I am interested in roles that combine systems thinking, delivery clarity and stakeholder impact.",
  strengthsAnswer:
    "My strengths are requirements analysis, stakeholder management, UAT and operational problem solving.",
  availabilityAnswer: ""
}

const job = {
  jobTitle: "Technical Business Analyst",
  company: "OpenPayd",
  jobUrl:
    "https://jobs.lever.co/OpenPayd/11cfb95b-581c-4be5-82f0-1c1161626fbc",
  location: "London",
  workMode: "hybrid",
  jobDescription:
    "Technical Business Analyst role involving payments, API products, regulatory requirements, stakeholder engagement and clear system behaviours.",
  notes: "Controlled-cost V2 AI interview prep validation fixture.",
  skills: ["Payments", "API", "Requirements analysis", "Stakeholder management"],
  seniority: "Mid-level",
  summary: "Payments-focused technical business analyst opportunity.",
  gaps: ["Confirm exact work-right and hybrid expectations before applying."],
  fitScore: 84,
  recommendation: "High Priority",
  positioningAngle:
    "Position around payments systems, requirements clarity and practical delivery support.",
  scoreFactors: [
    "Role aligns to target business/systems analyst direction.",
    "Payments and API language matches saved project positioning."
  ]
}

const application = {
  id: "controlled-cost-ai-check",
  title: job.jobTitle,
  roleTitle: job.jobTitle,
  company: job.company,
  url: job.jobUrl,
  source: "jobs.lever.co",
  createdAt: new Date().toISOString(),
  status: "Interview",
  nextAction: "Run controlled-cost interview prep check",
  notes: job.positioningAngle
}

async function main() {
  if (!apiKey.trim()) {
    console.log(
      "SKIP - OPENAI_API_KEY is not set. Add a controlled-cost key to run the live V2 AI interview prep check."
    )
    return
  }

  const settings = {
    ...defaultWebAISettings,
    apiKey,
    model,
    monthlyBudgetUsd: 0.05,
    usedBudgetUsd: 0
  }

  assert.equal(canUseWebAI(settings), true)

  const fallbackPack = createLocalInterviewPrepPack(application, profile, job, {
    id: "controlled-cost-ai-check-pack"
  })
  const result = await generateAIInterviewPrepPack({
    settings,
    application,
    profile,
    reusableAnswers,
    job,
    fallbackPack
  })

  assert.ok(result.value.likelyQuestions.length > 0)
  assert.ok(result.value.starAnswerPrompts.length > 0)
  assert.ok(result.value.finalPrepChecklist.length > 0)
  assert.ok(result.approximateCostUsd <= settings.monthlyBudgetUsd)

  console.log(
    JSON.stringify(
      {
        ok: true,
        model,
        approximateCostUsd: result.approximateCostUsd,
        likelyQuestionCount: result.value.likelyQuestions.length,
        starPromptCount: result.value.starAnswerPrompts.length,
        checklistCount: result.value.finalPrepChecklist.length
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
