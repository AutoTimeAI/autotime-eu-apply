import assert from "node:assert/strict"
import { filterSentryEvent, getSentryEnvironment } from "../lib/sentry-privacy.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

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
