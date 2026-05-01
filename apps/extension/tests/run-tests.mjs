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
import {
  clearApplicationContentDraft,
  clearJobAnalysisDraft,
  clearProfile,
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
})

test("saves and loads job analysis draft", async () => {
  resetStorage()

  const draft = {
    jobTitle: "Frontend Engineer",
    company: "Example Co",
    jobUrl: "https://example.com/jobs/frontend",
    location: "Germany",
    workMode: "remote",
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
    [
      "roleTitle",
      "company",
      "nextAction",
      "applicationUrl",
      "nextActionDate"
    ]
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
    notes: "Recruiter screen booked."
  })

  assert.deepEqual(await getApplications(), [
    {
      ...record,
      company: "Example Co",
      roleTitle: "Frontend Engineer",
      source: "example.com",
      status: "interview",
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
      notes: "Remote, EU role",
      createdAt: "2026-04-01T00:00:00.000Z",
      status: "applied"
    }
  ])

  assert.equal(
    csv,
    [
      '"Title","Role Title","Company","URL","Source","Created At","Status","Notes"',
      '"Senior ""Frontend"" Engineer","Frontend Engineer","Example Co","https://example.com/jobs/frontend","example.com","2026-04-01T00:00:00.000Z","applied","Remote, EU role"'
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
