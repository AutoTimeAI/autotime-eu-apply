import assert from "node:assert/strict"
import { filterSentryEvent, getSentryEnvironment } from "../lib/sentry-privacy.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

// Obviously-synthetic placeholder secret (sequential hex, not a random-looking
// value) - deliberately never a real or real-looking secret, so nothing here
// can ever be mistaken for (or leak a fragment of) an actual credential.
const fakeSecret = "0123456789abcdef0123456789abcdef"
const fakeQaBootstrapUrl = `https://autotime-eu-apply.vercel.app/api/qa/session?secret=${fakeSecret}`

test("redacts sensitive Sentry event fields", () => {
  const event = filterSentryEvent({
    breadcrumbs: [
      {
        data: {
          email: "person@example.com",
          route: "/dashboard",
          token: "secret-token"
        },
        message: "test"
      }
    ],
    contexts: {
      profile: {
        cv: "private cv text",
        safeStatus: "started"
      }
    },
    extra: {
      jobDescription: "full job description",
      status: "failed"
    },
    request: {
      cookies: "session=secret",
      data: {
        apiKey: "secret-key",
        status: "started"
      },
      headers: {
        authorization: "Bearer secret",
        "x-safe-header": "ok"
      },
      query_string: {
        phone: "+440000000000",
        route: "/api/sentry-test"
      }
    },
    tags: {
      payment: "card",
      route: "dashboard"
    }
  })

  assert.equal(event.request.cookies, undefined)
  assert.equal(event.request.headers.authorization, "[Filtered]")
  assert.equal(event.request.headers["x-safe-header"], "ok")
  assert.equal(event.request.data.apiKey, "[Filtered]")
  assert.equal(event.request.data.status, "started")
  assert.equal(event.request.query_string.phone, "[Filtered]")
  assert.equal(event.request.query_string.route, "/api/sentry-test")
  assert.equal(event.extra.jobDescription, "[Filtered]")
  assert.equal(event.extra.status, "failed")
  assert.equal(event.contexts.profile.cv, "[Filtered]")
  assert.equal(event.contexts.profile.safeStatus, "started")
  assert.equal(event.tags.payment, "[Filtered]")
  assert.equal(event.tags.route, "dashboard")
  assert.equal(event.breadcrumbs[0].data.email, "[Filtered]")
  assert.equal(event.breadcrumbs[0].data.token, "[Filtered]")
  assert.equal(event.breadcrumbs[0].data.route, "/dashboard")
})

test("redacts a secret in a request.url query string", () => {
  const event = filterSentryEvent({
    request: {
      url: `https://autotime-eu-apply.vercel.app/api/example?secret=${fakeSecret}&safe=1`
    }
  })

  assert.doesNotMatch(event.request.url, new RegExp(fakeSecret))
  assert.match(event.request.url, /secret=%5BFiltered%5D/)
  assert.match(event.request.url, /safe=1/)
})

test("redacts a QA session-bootstrap URL end to end (request.url, breadcrumb.data.url, breadcrumb.message)", () => {
  const event = filterSentryEvent({
    breadcrumbs: [
      {
        category: "fetch",
        data: { url: fakeQaBootstrapUrl, method: "GET" },
        message: `GET ${fakeQaBootstrapUrl} 200`
      },
      { message: "/dashboard" }
    ],
    request: {
      url: fakeQaBootstrapUrl
    }
  })

  assert.doesNotMatch(event.request.url, new RegExp(fakeSecret))
  assert.doesNotMatch(event.breadcrumbs[0].message, new RegExp(fakeSecret))
  assert.doesNotMatch(JSON.stringify(event.breadcrumbs[0].data), new RegExp(fakeSecret))
  assert.equal(event.breadcrumbs[1].message, "/dashboard")
})

test("redacts bearer tokens from request headers", () => {
  const event = filterSentryEvent({
    request: {
      headers: {
        authorization: `Bearer ${fakeSecret}`,
        "x-safe-header": "ok"
      }
    }
  })

  assert.equal(event.request.headers.authorization, "[Filtered]")
  assert.doesNotMatch(JSON.stringify(event.request.headers), new RegExp(fakeSecret))
  assert.equal(event.request.headers["x-safe-header"], "ok")
})

test("strips cookies entirely from request.cookies", () => {
  const event = filterSentryEvent({
    request: {
      cookies: `sb-access-token=${fakeSecret}; other=1`
    }
  })

  assert.equal(event.request.cookies, undefined)
})

test("redacts sensitive fields nested at arbitrary depth", () => {
  const event = filterSentryEvent({
    extra: {
      application: {
        submission: {
          draft: {
            cvText: "full CV text",
            metadata: { safeField: "ok" }
          }
        }
      }
    }
  })

  assert.equal(event.extra.application.submission.draft.cvText, "[Filtered]")
  assert.equal(event.extra.application.submission.draft.metadata.safeField, "ok")
})

test("redacts secret-bearing breadcrumb messages, not just breadcrumb.data", () => {
  const event = filterSentryEvent({
    breadcrumbs: [
      { message: `Navigated to /api/qa/session?secret=${fakeSecret}` },
      { message: "Navigated to /dashboard/applications" }
    ]
  })

  assert.doesNotMatch(event.breadcrumbs[0].message, new RegExp(fakeSecret))
  assert.match(event.breadcrumbs[0].message, /secret=%5BFiltered%5D/)
  assert.equal(event.breadcrumbs[1].message, "Navigated to /dashboard/applications")
})

test("maps Sentry environment to development or production only", () => {
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV
  const originalAutotimeEnv = process.env.NEXT_PUBLIC_AUTOTIME_ENV
  const originalVercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV
  const originalNodeEnv = process.env.NODE_ENV

  try {
    process.env.NEXT_PUBLIC_APP_ENV = "production"
    assert.equal(getSentryEnvironment(), "production")

    process.env.NEXT_PUBLIC_APP_ENV = "preview"
    process.env.NODE_ENV = "production"
    assert.equal(getSentryEnvironment(), "development")

    delete process.env.NEXT_PUBLIC_APP_ENV
    delete process.env.NEXT_PUBLIC_AUTOTIME_ENV
    delete process.env.NEXT_PUBLIC_VERCEL_ENV
    process.env.NODE_ENV = "production"
    assert.equal(getSentryEnvironment(), "production")
  } finally {
    if (originalAppEnv === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ENV
    } else {
      process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv
    }

    if (originalAutotimeEnv === undefined) {
      delete process.env.NEXT_PUBLIC_AUTOTIME_ENV
    } else {
      process.env.NEXT_PUBLIC_AUTOTIME_ENV = originalAutotimeEnv
    }

    if (originalVercelEnv === undefined) {
      delete process.env.NEXT_PUBLIC_VERCEL_ENV
    } else {
      process.env.NEXT_PUBLIC_VERCEL_ENV = originalVercelEnv
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }
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
