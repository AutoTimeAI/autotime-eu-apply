import assert from "node:assert/strict"
import {
  getClientSafeRedirectPath,
  resolveSafeRedirectPath,
} from "../lib/safe-redirect-path.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

function requestUrl(redirectTo) {
  const url = new URL("https://app.example.com/auth/callback")
  if (redirectTo !== undefined) {
    url.searchParams.set("redirectTo", redirectTo)
  }
  return url
}

test("resolveSafeRedirectPath passes through a same-origin relative path", () => {
  assert.equal(
    resolveSafeRedirectPath(requestUrl("/dashboard/settings?ok=1")),
    "/dashboard/settings?ok=1",
  )
})

test("resolveSafeRedirectPath falls back when redirectTo is missing", () => {
  assert.equal(resolveSafeRedirectPath(requestUrl()), "/dashboard")
})

test("resolveSafeRedirectPath falls back for a value not starting with /", () => {
  assert.equal(resolveSafeRedirectPath(requestUrl("dashboard")), "/dashboard")
})

test("resolveSafeRedirectPath falls back for a protocol-relative //host value", () => {
  assert.equal(resolveSafeRedirectPath(requestUrl("//evil.example/path")), "/dashboard")
})

test("resolveSafeRedirectPath falls back for a backslash host-takeover value", () => {
  // Browsers and Node's URL parser both treat a leading "/\" the same as
  // "//", so this resolves to https://evil.example/ unless rejected.
  assert.equal(resolveSafeRedirectPath(requestUrl("/\\evil.example")), "/dashboard")
})

test("resolveSafeRedirectPath falls back for an absolute cross-origin value", () => {
  assert.equal(resolveSafeRedirectPath(requestUrl("https://evil.example/path")), "/dashboard")
})

test("resolveSafeRedirectPath honors a custom fallback", () => {
  assert.equal(resolveSafeRedirectPath(requestUrl("//evil.example"), "/admin"), "/admin")
})

test("getClientSafeRedirectPath passes through a same-origin relative path", () => {
  assert.equal(getClientSafeRedirectPath("/dashboard/settings"), "/dashboard/settings")
})

test("getClientSafeRedirectPath falls back for null", () => {
  assert.equal(getClientSafeRedirectPath(null), "/dashboard")
})

test("getClientSafeRedirectPath falls back for a value not starting with /", () => {
  assert.equal(getClientSafeRedirectPath("https://evil.example"), "/dashboard")
})

test("getClientSafeRedirectPath falls back for a protocol-relative //host value", () => {
  assert.equal(getClientSafeRedirectPath("//evil.example/path"), "/dashboard")
})

test("getClientSafeRedirectPath falls back for a backslash host-takeover value", () => {
  assert.equal(getClientSafeRedirectPath("/\\evil.example"), "/dashboard")
})

test("getClientSafeRedirectPath falls back for a tab-character host-takeover value", () => {
  // The URL parser strips ASCII tab/CR/LF as its very first parsing step,
  // before any other processing - "/\t/evil.example" (a literal tab, not
  // the two-character backslash-t escape) collapses to "//evil.example",
  // a protocol-relative value that resolves to https://evil.example/. A
  // hand-rolled startsWith("/")/startsWith("//")/includes("\\") check
  // never sees the collapsed form, since it inspects the string before
  // any URL-parsing normalization happens.
  assert.equal(getClientSafeRedirectPath("/\t/evil.example"), "/dashboard")
  assert.equal(getClientSafeRedirectPath("/\r/evil.example"), "/dashboard")
  assert.equal(getClientSafeRedirectPath("/\n/evil.example"), "/dashboard")
})

test("getClientSafeRedirectPath preserves query and hash on a safe path", () => {
  assert.equal(
    getClientSafeRedirectPath("/dashboard/settings?ok=1#section"),
    "/dashboard/settings?ok=1#section",
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
