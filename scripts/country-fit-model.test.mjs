import assert from "node:assert/strict"
import { evaluateCountryFit } from "../packages/shared/src/fit-model.ts"
import { getCountryRule } from "../packages/shared/src/country-rules.ts"

const baseProfile = {
  fullName: "Rajan Patel",
  email: "rajan@example.com",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "London",
  targetCountries: "United Kingdom, Ireland, Netherlands, Germany",
  targetRoles: "Business Analyst, Systems Analyst, Product Analyst",
  workRightDetails: "I have UK work authorisation and do not require sponsorship.",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "Negotiable",
  baseCvText:
    "Business analyst with payments, requirements, stakeholder management, UAT, SQL, API and delivery experience.",
  projectSummaries: "Payments migration and reporting projects.",
  experienceHighlights: "Requirements analysis, UAT, systems support and delivery."
}

const baseJob = {
  jobTitle: "Business Systems Analyst",
  company: "Example FinTech",
  jobUrl: "https://example.com/jobs/business-systems-analyst",
  location: "London, United Kingdom",
  workMode: "hybrid",
  jobDescription:
    "Hybrid business systems analyst role in London requiring requirements analysis, stakeholder management, UAT, SQL, API and payments experience.",
  notes: "",
  skills: ["Requirements", "Stakeholder management", "UAT", "SQL", "API"],
  seniority: "Mid-level",
  summary: "",
  gaps: [],
  fitScore: 0,
  recommendation: "Worth Applying",
  positioningAngle: "",
  scoreFactors: []
}

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("recommends apply when skill, country and work-right signals are strong", () => {
  const result = evaluateCountryFit({
    profile: baseProfile,
    job: baseJob,
    context: {
      candidatePosition: "foreign-candidate",
      targetCountry: "United Kingdom"
    }
  })

  assert.equal(result.decision, "Apply now")
  assert.equal(result.contentGate, "ready")
  assert.ok(result.overallScore >= 76)
  assert.equal(result.blockers.length, 0)
})

test("blocks content when sponsorship is required and the role rejects it", () => {
  const result = evaluateCountryFit({
    profile: {
      ...baseProfile,
      sponsorshipNeeded: true,
      workRightDetails: "I need Skilled Worker visa sponsorship."
    },
    job: {
      ...baseJob,
      jobDescription:
        "Business analyst role. Candidates must have existing right to work. We are unable to sponsor visas."
    },
    context: {
      candidatePosition: "foreign-candidate",
      targetCountry: "United Kingdom"
    }
  })

  assert.equal(result.decision, "Skip for now")
  assert.equal(result.contentGate, "blocked")
  assert.ok(result.blockers.some((item) => item.includes("Sponsorship")))
})

test("labels uncertain viable roles as stretch applications", () => {
  const result = evaluateCountryFit({
    profile: {
      ...baseProfile,
      baseCvText: "Analyst with stakeholder experience.",
      experienceHighlights: "",
      projectSummaries: ""
    },
    job: {
      ...baseJob,
      location: "Amsterdam, Netherlands",
      jobDescription:
        "Product analyst role with data, experimentation and product discovery."
    },
    context: {
      candidatePosition: "foreign-candidate",
      targetCountry: "Netherlands"
    }
  })

  assert.equal(result.decision, "Stretch application")
  assert.equal(result.contentGate, "stretch")
})

test("uses country rule packs for language and relocation evidence", () => {
  const result = evaluateCountryFit({
    profile: {
      ...baseProfile,
      targetCountries: "Germany",
      workRightDetails: "I would need visa support and can relocate to Germany.",
      sponsorshipNeeded: true
    },
    job: {
      ...baseJob,
      location: "Berlin, Germany",
      jobDescription:
        "Business analyst role in Berlin with German B2 required, hybrid delivery and relocation support."
    },
    context: {
      candidatePosition: "foreign-candidate",
      targetCountry: "Germany"
    }
  })

  assert.equal(result.countryRule.code, "DE")
  assert.ok(result.evidenceChecklist.some((item) => item.includes("German")))
  assert.ok(
    result.components.some(
      (item) =>
        item.key === "countryLocationFit" &&
        item.rationale.includes("language expectations")
    )
  )
})

test("uses outcome history to become stricter on repeated blockers", () => {
  const withoutHistory = evaluateCountryFit({
    profile: {
      ...baseProfile,
      sponsorshipNeeded: true,
      workRightDetails: "I need Skilled Worker visa sponsorship."
    },
    job: {
      ...baseJob,
      jobDescription:
        "Business analyst role in London requiring requirements, stakeholder management and payments experience."
    },
    context: {
      candidatePosition: "foreign-candidate",
      targetCountry: "United Kingdom"
    }
  })
  const withHistory = evaluateCountryFit({
    profile: {
      ...baseProfile,
      sponsorshipNeeded: true,
      workRightDetails: "I need Skilled Worker visa sponsorship."
    },
    job: {
      ...baseJob,
      jobDescription:
        "Business analyst role in London requiring requirements, stakeholder management and payments experience."
    },
    context: {
      candidatePosition: "foreign-candidate",
      targetCountry: "United Kingdom",
      outcomeSignals: {
        totalTracked: 3,
        interviews: 0,
        sponsorshipBlocks: 3,
        workRightBlocks: 0,
        noResponses: 0,
        positiveOutcomes: 0
      }
    }
  })

  assert.ok(withHistory.overallScore < withoutHistory.overallScore)
  assert.ok(withHistory.learningPrompt.includes("Outcome history"))
})

test("does not match a country whose name merely starts with another country's short alias", () => {
  const rule = getCountryRule("Ukraine")

  assert.notEqual(rule.code, "GB")
})

test("still matches a genuine alias substring inside a longer country name", () => {
  const exact = getCountryRule("uk")
  const withWords = getCountryRule("United Kingdom")

  assert.equal(exact.code, "GB")
  assert.equal(withWords.code, "GB")
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
