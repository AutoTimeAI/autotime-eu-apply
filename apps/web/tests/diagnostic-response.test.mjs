import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { toPublicApiError } from "../lib/public-api-error.ts"

const internal = "relation private_schema.user_accounts does not exist"
const failure = toPublicApiError(internal, 500)
assert.doesNotMatch(failure, /private_schema|user_accounts/)
assert.match(failure, /diagnostic ID/i)
assert.equal(toPublicApiError("Choose a supported value.", 400), "Choose a supported value.")

const diagnosticsSource = await readFile(
  new URL("../lib/diagnostics.ts", import.meta.url),
  "utf8",
)
assert.match(diagnosticsSource, /toPublicApiError\(error, status\)/)

for (const route of [
  new URL("../app/api/profile/photo/route.ts", import.meta.url),
  new URL("../app/api/profile/import-cv/route.ts", import.meta.url),
]) {
  const source = await readFile(route, "utf8")
  assert.doesNotMatch(source, /data:\s*null,\s*error:\s*error\s+instanceof\s+Error/)
}

console.log("PASS API diagnostic responses redact internal 5xx details")
