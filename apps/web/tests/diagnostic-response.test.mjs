import assert from "node:assert/strict"
import { readFile, readdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
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

// Every route.ts under app/api, found by walking the directory rather than
// naming files one at a time. A hand-maintained list only ever grows when
// someone remembers to add the file they just audited - this bug pattern
// (a raw error.message handed straight to the client on a 500, bypassing
// every redaction helper the codebase has) was found and fixed in the same
// shape four separate times across four separate audits precisely because
// each fix only checked the files that audit happened to look at. Walking
// every route.ts means a fifth occurrence - in a file nobody happens to be
// auditing that week - fails here instead of shipping.
const apiRoot = fileURLToPath(new URL("../app/api", import.meta.url))

async function findRouteFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await findRouteFiles(full)))
    } else if (entry.name === "route.ts") {
      files.push(full)
    }
  }
  return files
}

// Flags a client-facing `error:` response field whose value can resolve to
// `error.message`/`error?.message` - a raw exception's text can carry
// schema/table/column names, upstream API detail, or anything else an
// internal error happened to say, none of it meant for a client. Anchored
// on the literal `error:` key and searching forward (not just "does
// error.message appear anywhere in this file") so it doesn't misfire on
// `error.message` used only for server-side logging (a console.error
// payload) or only to compute a status code, both real, safe patterns
// found in this codebase - neither ever puts the raw text in front of a
// caller.
//
// A handful of routes deliberately expose a *custom* Error subclass's own
// message (RateLimitError, FeatureGateError, RoleIntelligenceUnavailableError
// - see their definitions) whose text is always a hand-authored, client-safe
// constant, never a raw exception. Those are legitimate and shouldn't be
// flagged, but detecting that safely and generally (the guard is often a
// separate `if` above the return, not inline, and unrelated `instanceof
// Error` checks for logging can sit in between) isn't reliable with a
// regex-only heuristic - the false-positive and false-negative failure
// modes are both real, as this test's own history of getting the check
// wrong first demonstrates. So instead: an explicit, reviewed exemption.
// Every legitimate case must carry an inline `/* safe-error-message:
// <ClassName> */` comment on the same line, immediately after the access -
// visible in code review, and the only way to suppress this check. No
// comment means the access is presumed unsafe.
const clientFacingMessagePattern = /error:\s*[^,;{}]{0,160}?error\??\.message/g
const exemptionPattern = /\/\*\s*safe-error-message:\s*\w+\s*\*\//
const safeHelperPattern = /toPublicApiError|diagnosticJson|safeAdminError/

const routeFiles = await findRouteFiles(apiRoot)
assert.ok(routeFiles.length > 30, "expected to find the full apps/web/app/api route tree")

const offenders = []
for (const file of routeFiles) {
  const source = await readFile(file, "utf8")
  if (safeHelperPattern.test(source)) continue

  for (const match of source.matchAll(clientFacingMessagePattern)) {
    const lineStart = source.lastIndexOf("\n", match.index) + 1
    const lineEnd = source.indexOf("\n", match.index + match[0].length)
    const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd)
    if (exemptionPattern.test(line)) continue

    offenders.push(path.relative(apiRoot, file))
    break
  }
}

assert.deepEqual(
  offenders,
  [],
  `route(s) return a raw error.message on failure without redacting it through toPublicApiError/diagnosticJson/safeAdminError: ${offenders.join(", ")}`,
)

console.log(`PASS API diagnostic responses redact internal 5xx details (scanned ${routeFiles.length} routes)`)
