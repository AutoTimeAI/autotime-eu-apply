import assert from "node:assert/strict"
import {
  defaultUrl,
  expectedMarkers,
  getWebSmokeUrl,
  runWebDashboardSmoke
} from "./smoke-web-dashboard.mjs"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function createResponse({
  ok = true,
  status = 200,
  contentType = "text/html; charset=utf-8",
  body = expectedMarkers.join("\n")
} = {}) {
  return {
    ok,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? contentType : null
      }
    },
    async text() {
      return body
    }
  }
}

function createFetch(response) {
  return async () => response
}

test("passes when deployed dashboard HTML contains expected markers", async () => {
  const result = await runWebDashboardSmoke({
    url: "https://example.test",
    fetchImpl: createFetch(createResponse())
  })

  assert.deepEqual(result, { ok: true })
})

test("fails when response status is not successful", async () => {
  const result = await runWebDashboardSmoke({
    fetchImpl: createFetch(createResponse({ ok: false, status: 404 }))
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /expected HTTP 2xx/)
  assert.match(result.message, /404/)
})

test("fails when response is not HTML", async () => {
  const result = await runWebDashboardSmoke({
    fetchImpl: createFetch(
      createResponse({ contentType: "application/json", body: "{}" })
    )
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /expected text\/html/)
  assert.match(result.message, /application\/json/)
})

test("fails when expected dashboard markers are missing", async () => {
  const result = await runWebDashboardSmoke({
    fetchImpl: createFetch(
      createResponse({
        body: expectedMarkers
          .filter((marker) => marker !== "EU Fit Engine")
          .join("\n")
      })
    )
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /missing dashboard markers/)
  assert.match(result.message, /EU Fit Engine/)
})

test("fails with fetch error message when request throws an Error", async () => {
  const result = await runWebDashboardSmoke({
    fetchImpl: async () => {
      throw new Error("network down")
    }
  })

  assert.equal(result.ok, false)
  assert.match(result.message, /network down/)
})

test("fails with fallback message when request throws an unknown value", async () => {
  const result = await runWebDashboardSmoke({
    fetchImpl: async () => {
      throw "network down"
    }
  })

  assert.deepEqual(result, { ok: false, message: "request failed" })
})

test("reads default and environment override smoke URLs", () => {
  assert.equal(defaultUrl, "https://autotime-eu-apply.vercel.app")
  assert.equal(getWebSmokeUrl({}), defaultUrl)
  assert.equal(
    getWebSmokeUrl({ PLAYWRIGHT_BASE_URL: "https://playwright.example.test" }),
    "https://playwright.example.test"
  )
  assert.equal(
    getWebSmokeUrl({ WEB_SMOKE_URL: "https://preview.example.test" }),
    "https://preview.example.test"
  )
  assert.equal(
    getWebSmokeUrl({
      SMOKE_BASE_URL: "https://smoke.example.test",
      WEB_SMOKE_URL: "https://preview.example.test",
      PLAYWRIGHT_BASE_URL: "https://playwright.example.test"
    }),
    "https://smoke.example.test"
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
