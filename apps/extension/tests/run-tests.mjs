import assert from "node:assert/strict"
import {
  applicationsToCsv,
  filterApplications,
  hasApplicationWithUrl
} from "../lib/applications.ts"
import {
  canFillInput,
  detectFieldFromText,
  detectReusableAnswerFromText,
  getFieldValues,
  getNameParts,
  getReusableAnswerValues
} from "../lib/autofill.ts"
import { formatJobPageNotes, inferJobPageDetails } from "../lib/job-page.ts"
import { inferJobFitAnalysis } from "../lib/job-analysis.ts"
import {
  clearApplicationContentDraft,
  clearJobAnalysisDraft,
  clearProfile,
  clearReusableAnswers,
  clearTrackerDraft,
  deleteApplication,
  getApplicationContentDraft,
  getApplications,
  getJobAnalysisDraft,
  getProfile,
  getReusableAnswers,
  getTrackerDraft,
  saveApplicationContentDraft,
  saveApplication,
  saveJobAnalysisDraft,
  saveProfile,
  saveReusableAnswers,
  saveTrackerDraft,
  updateApplication
} from "../lib/storage.ts"
import {
  validateApplicationContentDraft,
  validateJobAnalysisDraft,
  validateProfile,
  validateReusableAnswers,
  validateTrackerDraft
} from "../lib/validation.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

const store = new Map()

globalThis.chrome = {
  storage: {
    local: {
      async get(key) {
        return { [key]: store.get(key) }
      },
      async set(values) {
        Object.entries(values).forEach(([key, value]) => {
          store.set(key, value)
        })
      },
      async remove(key) {
        store.delete(key)
      }
    }
  }
}

function resetStorage() {
  store.clear()
}

test("splits a full name into first and last name", () => {
  assert.deepEqual(getNameParts("Ada Lovelace"), {
    firstName: "Ada",
    lastName: "Lovelace"
  })

  assert.deepEqual(getNameParts("  Grace Brewster Murray Hopper  "), {
    firstName: "Grace",
    lastName: "Brewster Murray Hopper"
  })
})

test("maps profile values to autofill fields", () => {
  assert.deepEqual(
    getFieldValues({
      fullName: "Alan Turing",
      email: "alan@example.com",
      phone: "+44 1234"
    }),
    {
      firstName: "Alan",
      lastName: "Turing",
      email: "alan@example.com",
      phone: "+44 1234"
    }
  )
})

test("detects obvious application form fields", () => {
  assert.equal(detectFieldFromText("text", "first name"), "firstName")
  assert.equal(detectFieldFromText("text", "surname"), "lastName")
  assert.equal(detectFieldFromText("email", ""), "email")
  assert.equal(detectFieldFromText("tel", ""), "phone")
  assert.equal(detectFieldFromText("text", "mobile number"), "phone")
})

test("maps reusable answers to autofill fields", () => {
  assert.deepEqual(
    getReusableAnswerValues({
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I am open to relocation.",
      workAuthorisationAnswer: "I am authorised to work.",
      noticePeriodAnswer: "My notice period is one month."
    }),
    {
      sponsorshipAnswer: "I do not require sponsorship.",
      relocationAnswer: "I am open to relocation.",
      workAuthorisationAnswer: "I am authorised to work.",
      noticePeriodAnswer: "My notice period is one month."
    }
  )
})

test("detects obvious reusable answer questions", () => {
  assert.equal(
    detectReusableAnswerFromText("Do you require visa sponsorship?"),
    "sponsorshipAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("Are you willing to relocate?"),
    "relocationAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("Are you authorised to work in this country?"),
    "workAuthorisationAnswer"
  )
  assert.equal(
    detectReusableAnswerFromText("What is your notice period?"),
    "noticePeriodAnswer"
  )
})

test("ignores unclear fields", () => {
  assert.equal(detectFieldFromText("text", "search jobs"), null)
  assert.equal(detectFieldFromText("url", "portfolio"), null)
  assert.equal(detectReusableAnswerFromText("Tell us about yourself"), null)
})

test("fills only empty visible enabled supported inputs", () => {
  const fillable = {
    disabled: false,
    readOnly: false,
    isVisible: true,
    type: "text",
    value: ""
  }

  assert.equal(canFillInput(fillable), true)
  assert.equal(canFillInput({ ...fillable, value: "Already filled" }), false)
  assert.equal(canFillInput({ ...fillable, disabled: true }), false)
  assert.equal(canFillInput({ ...fillable, readOnly: true }), false)
  assert.equal(canFillInput({ ...fillable, isVisible: false }), false)
  assert.equal(canFillInput({ ...fillable, type: "password" }), false)
})

test("infers job page details from common page text", () => {
  assert.deepEqual(
    inferJobPageDetails({
      title: "Senior Frontend Engineer at Example Co - Careers",
      url: "https://example.com/jobs/frontend"
    }),
    {
      roleTitle: "Senior Frontend Engineer",
      company: "Example Co",
      location: "",
      url: "https://example.com/jobs/frontend",
      source: "example.com",
      pageTitle: "Senior Frontend Engineer at Example Co - Careers"
    }
  )

  assert.deepEqual(
    inferJobPageDetails({
      title: "Backend Engineer | Example Jobs",
      heading: "Staff Backend Engineer",
      company: "Example Co",
      location: "London, United Kingdom",
      url: "https://jobs.example.co/backend"
    }),
    {
      roleTitle: "Staff Backend Engineer",
      company: "Example Co",
      location: "London, United Kingdom",
      url: "https://jobs.example.co/backend",
      source: "jobs.example.co",
      pageTitle: "Backend Engineer | Example Jobs"
    }
  )
})

test("formats imported job page notes from detected metadata", () => {
  assert.equal(
    formatJobPageNotes({
      roleTitle: "Staff Backend Engineer",
      company: "Example Co",
      location: "London, United Kingdom",
      url: "https://jobs.example.co/backend",
      source: "jobs.example.co",
      pageTitle: "Backend Engineer | Example Jobs"
    }),
    [
      "Location: London, United Kingdom",
      "Source: jobs.example.co",
      "Page title: Backend Engineer | Example Jobs"
    ].join("\n")
  )

  assert.equal(
    formatJobPageNotes({
      roleTitle: "Senior Frontend Engineer",
      company: "Example Co",
      location: "",
      url: "https://example.com/jobs/frontend",
      source: "example.com",
      pageTitle: "Senior Frontend Engineer at Example Co - Careers"
    }),
    [
      "Source: example.com",
      "Page title: Senior Frontend Engineer at Example Co - Careers"
    ].join("\n")
  )
})

test("infers transparent job fit analysis", () => {
  const analysis = inferJobFitAnalysis(
    {
      jobTitle: "FinTech Business Analyst",
      company: "Example Bank",
      jobUrl: "https://example.com/jobs/business-analyst",
      location: "United Kingdom",
      workMode: "hybrid",
      jobDescription: "",
      notes: "Payments platform requirements and stakeholder delivery."
    },
    {
      fullName: "Rajan Kumar",
      email: "rajan@example.com",
      phone: "+44 1234 567890",
      currentCountry: "United Kingdom",
      currentCity: "London",
      sponsorshipNeeded: false,
      relocationWillingness: "depends",
      noticePeriod: "1 month"
    }
  )

  assert.equal(analysis.recommendation, "strong-fit")
  assert.equal(analysis.fitScore, 100)
  assert.equal(
    analysis.positioningAngle,
    "Position around FinTech systems, application support, and cross-functional delivery."
  )
  assert.ok(
    analysis.scoreFactors?.includes(
      "Role title aligns with the target analyst/systems role family."
    )
  )
})

test("uses pasted job description text in job fit analysis", () => {
  const analysis = inferJobFitAnalysis(
    {
      jobTitle: "Associate Consultant",
      company: "Example Co",
      jobUrl: "https://example.com/jobs/consultant",
      location: "United Kingdom",
      workMode: "remote",
      jobDescription:
        "Business analyst role supporting payments requirements and systems stakeholders.",
      notes: ""
    },
    null
  )

  assert.equal(analysis.recommendation, "strong-fit")
  assert.equal(
    analysis.positioningAngle,
    "Position around FinTech systems, application support, and cross-functional delivery."
  )
  assert.ok(
    analysis.scoreFactors?.includes(
      "Role title aligns with the target analyst/systems role family."
    )
  )
})

test("saves and loads candidate profile", async () => {
  resetStorage()

  const profile = {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+44 1234",
    currentCountry: "United Kingdom",
    currentCity: "London",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    noticePeriod: "1 month"
  }

  await saveProfile(profile)

  assert.deepEqual(await getProfile(), profile)

  await clearProfile()

  assert.equal(await getProfile(), null)
})

test("saves and loads reusable answers", async () => {
  resetStorage()

  const answers = {
    sponsorshipAnswer: "I do not require sponsorship.",
    relocationAnswer: "I am open to relocation.",
    workAuthorisationAnswer: "I am authorised to work.",
    noticePeriodAnswer: "My notice period is one month."
  }

  await saveReusableAnswers(answers)

  assert.deepEqual(await getReusableAnswers(), answers)

  await clearReusableAnswers()

  assert.equal(await getReusableAnswers(), null)
})

test("saves and loads job analysis draft", async () => {
  resetStorage()

  const draft = {
    jobTitle: "Frontend Engineer",
    company: "Example Co",
    jobUrl: "https://example.com/jobs/frontend",
    location: "Germany",
    workMode: "remote",
    jobDescription: "Frontend role using React and TypeScript.",
    notes: "Manual notes only."
  }

  await saveJobAnalysisDraft(draft)

  assert.deepEqual(await getJobAnalysisDraft(), draft)

  await clearJobAnalysisDraft()

  assert.equal(await getJobAnalysisDraft(), null)
})

test("saves and loads application content draft", async () => {
  resetStorage()

  const draft = {
    coverLetter: "Dear hiring team...",
    profileSummary: "Frontend engineer with EU product experience.",
    motivationAnswer: "I am interested in this role because...",
    strengthsAnswer: "My strengths include...",
    availabilityAnswer: "I am available after one month."
  }

  await saveApplicationContentDraft(draft)

  assert.deepEqual(await getApplicationContentDraft(), draft)

  await clearApplicationContentDraft()

  assert.equal(await getApplicationContentDraft(), null)
})

test("saves and loads tracker draft", async () => {
  resetStorage()

  const draft = {
    roleTitle: "Frontend Engineer",
    company: "Example Co",
    applicationUrl: "https://example.com/jobs/frontend",
    status: "draft",
    nextAction: "Tailor cover letter",
    nextActionDate: "2026-05-01",
    notes: "Manual tracker draft only."
  }

  await saveTrackerDraft(draft)

  assert.deepEqual(await getTrackerDraft(), draft)

  await clearTrackerDraft()

  assert.equal(await getTrackerDraft(), null)
})

test("validates missing and mismatched profile fields", () => {
  const issues = validateProfile({
    fullName: "",
    email: "not-an-email",
    phone: "abc",
    currentCountry: "",
    currentCity: "",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    noticePeriod: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    [
      "fullName",
      "currentCountry",
      "currentCity",
      "noticePeriod",
      "email",
      "phone"
    ]
  )
})

test("validates profile phone against selected country calling code", () => {
  const issues = validateProfile({
    fullName: "Rajan Kumar",
    email: "rajan@example.com",
    phone: "+1 202 555 0199",
    currentCountry: "United Kingdom",
    currentCity: "London",
    sponsorshipNeeded: false,
    relocationWillingness: "depends",
    noticePeriod: "1 month"
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["phone"]
  )
  assert.equal(
    issues[0]?.message,
    "Phone must start with United Kingdom's calling code (+44)."
  )
})

test("validates job analysis draft fields", () => {
  const issues = validateJobAnalysisDraft({
    jobTitle: "",
    company: "",
    jobUrl: "ftp://example.com/job",
    location: "",
    workMode: "unknown",
    jobDescription: "",
    notes: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["jobTitle", "company", "location", "workMode", "jobUrl"]
  )
})

test("validates application content draft fields", () => {
  const issues = validateApplicationContentDraft({
    coverLetter: "Too short",
    profileSummary: "Short",
    motivationAnswer: "",
    strengthsAnswer: "",
    availabilityAnswer: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["motivationAnswer", "coverLetter", "profileSummary"]
  )
})

test("validates reusable answer fields", () => {
  const issues = validateReusableAnswers({
    sponsorshipAnswer: "",
    relocationAnswer: "",
    workAuthorisationAnswer: "",
    noticePeriodAnswer: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    [
      "sponsorshipAnswer",
      "relocationAnswer",
      "workAuthorisationAnswer",
      "noticePeriodAnswer"
    ]
  )
})

test("validates tracker draft fields", () => {
  const issues = validateTrackerDraft({
    roleTitle: "",
    company: "",
    applicationUrl: "not-a-url",
    status: "draft",
    nextAction: "",
    nextActionDate: "not-a-date",
    notes: ""
  })

  assert.deepEqual(
    issues.map((issue) => issue.field),
    ["roleTitle", "company", "nextAction", "applicationUrl", "nextActionDate"]
  )
})

test("saves applications newest first and deletes by id", async () => {
  resetStorage()

  const first = {
    id: "first",
    title: "First role",
    url: "https://example.com/first",
    createdAt: "2026-04-01T00:00:00.000Z",
    status: "draft"
  }

  const second = {
    id: "second",
    title: "Second role",
    url: "https://example.com/second",
    createdAt: "2026-04-02T00:00:00.000Z",
    status: "draft"
  }

  await saveApplication(first)
  await saveApplication(second)

  assert.deepEqual(await getApplications(), [second, first])

  await deleteApplication("second")

  assert.deepEqual(await getApplications(), [first])
})

test("updates application tracker fields", async () => {
  resetStorage()

  const record = {
    id: "application",
    title: "Saved role",
    url: "https://example.com/role",
    createdAt: "2026-04-03T00:00:00.000Z",
    status: "draft"
  }

  await saveApplication(record)
  await updateApplication("application", {
    company: "Example Co",
    roleTitle: "Frontend Engineer",
    source: "example.com",
    status: "interview",
    nextAction: "Send follow-up",
    nextActionDate: "2026-04-10",
    notes: "Recruiter screen booked."
  })

  assert.deepEqual(await getApplications(), [
    {
      ...record,
      company: "Example Co",
      roleTitle: "Frontend Engineer",
      source: "example.com",
      status: "interview",
      nextAction: "Send follow-up",
      nextActionDate: "2026-04-10",
      notes: "Recruiter screen booked."
    }
  ])
})

test("filters applications by query and status", () => {
  const applications = [
    {
      id: "draft",
      title: "Original title",
      roleTitle: "Frontend Engineer",
      company: "Example Co",
      source: "example.com",
      url: "https://example.com/jobs/frontend",
      notes: "React role",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "draft"
    },
    {
      id: "interview",
      title: "Backend Engineer",
      company: "Server Co",
      source: "server.example",
      url: "https://server.example/jobs/backend",
      nextAction: "Prepare system design notes",
      notes: "Recruiter screen booked",
      createdAt: "2026-04-02T00:00:00.000Z",
      status: "interview"
    }
  ]

  assert.deepEqual(
    filterApplications(applications, "react", "all").map(
      (application) => application.id
    ),
    ["draft"]
  )

  assert.deepEqual(
    filterApplications(applications, "engineer", "interview").map(
      (application) => application.id
    ),
    ["interview"]
  )

  assert.deepEqual(filterApplications(applications, "missing", "all"), [])
  assert.deepEqual(
    filterApplications(applications, "system design", "all").map(
      (application) => application.id
    ),
    ["interview"]
  )
})

test("detects duplicate application urls", () => {
  const applications = [
    {
      id: "existing",
      title: "Existing role",
      url: "https://Example.com/jobs/123#overview",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "draft"
    }
  ]

  assert.equal(
    hasApplicationWithUrl(applications, "https://example.com/jobs/123"),
    true
  )
  assert.equal(
    hasApplicationWithUrl(applications, "https://example.com/jobs/456"),
    false
  )
})

test("exports applications to csv", () => {
  const csv = applicationsToCsv([
    {
      id: "application",
      title: 'Senior "Frontend" Engineer',
      roleTitle: "Frontend Engineer",
      company: "Example Co",
      source: "example.com",
      url: "https://example.com/jobs/frontend",
      nextAction: "Follow up",
      nextActionDate: "2026-04-10",
      notes: "Remote, EU role",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "applied"
    }
  ])

  assert.equal(
    csv,
    [
      '"Title","Role Title","Company","URL","Source","Created At","Status","Next Action","Next Action Date","Notes"',
      '"Senior ""Frontend"" Engineer","Frontend Engineer","Example Co","https://example.com/jobs/frontend","example.com","2026-04-01T00:00:00.000Z","applied","Follow up","2026-04-10","Remote, EU role"'
    ].join("\n")
  )
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
