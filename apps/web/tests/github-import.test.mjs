import assert from "node:assert/strict"
import { enrichCvFromGitHub, GitHubImportError } from "../lib/cv/sources/github.ts"

const tests = []

function test(name, run) {
  tests.push({ name, run })
}

test("enrichCvFromGitHub throws GitHubImportError (not a generic Error) for a non-OK GitHub response", async () => {
  // The route mapping this to a 4xx status relies on `instanceof
  // GitHubImportError` specifically - a plain Error here would fall
  // through to the generic 502 branch and get its safe, actionable
  // "check the username or token" message redacted by toPublicApiError.
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => new Response("not found", { status: 404 })
  try {
    await assert.rejects(() => enrichCvFromGitHub("does-not-exist"), GitHubImportError)
  } finally {
    globalThis.fetch = originalFetch
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
