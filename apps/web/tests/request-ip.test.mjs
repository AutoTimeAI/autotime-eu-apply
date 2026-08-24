import assert from "node:assert/strict"
import { getRequestIp } from "../lib/request-ip.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function fakeRequest(headers) {
  return { headers: new Headers(headers) }
}

test("prefers x-vercel-forwarded-for over x-forwarded-for", () => {
  const request = fakeRequest({
    "x-vercel-forwarded-for": "203.0.113.5",
    "x-forwarded-for": "198.51.100.9",
  })
  assert.equal(getRequestIp(request), "203.0.113.5")
})

test("falls back to x-forwarded-for", () => {
  const request = fakeRequest({ "x-forwarded-for": "198.51.100.9, 10.0.0.1" })
  assert.equal(getRequestIp(request), "198.51.100.9")
})

test("returns \"unknown\" when neither header is present", () => {
  const request = fakeRequest({})
  assert.equal(getRequestIp(request), "unknown")
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
