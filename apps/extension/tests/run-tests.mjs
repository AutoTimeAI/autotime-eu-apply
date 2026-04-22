import assert from "node:assert/strict"
import {
  canFillInput,
  detectFieldFromText,
  getFieldValues,
  getNameParts
} from "../lib/autofill.ts"
import {
  deleteApplication,
  getApplications,
  getProfile,
  getReusableAnswers,
  saveApplication,
  saveProfile,
  saveReusableAnswers,
  updateApplication
} from "../lib/storage.ts"

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

test("ignores unclear fields", () => {
  assert.equal(detectFieldFromText("text", "search jobs"), null)
  assert.equal(detectFieldFromText("url", "portfolio"), null)
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

test("updates application status and notes", async () => {
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
    status: "interview",
    notes: "Recruiter screen booked."
  })

  assert.deepEqual(await getApplications(), [
    {
      ...record,
      status: "interview",
      notes: "Recruiter screen booked."
    }
  ])
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
