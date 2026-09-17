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
  // The four AI routes below (found during a 2026-09-17 deep-dive audit
  // of the AI generation pipeline) bypassed diagnosticJson entirely and
  // returned a raw `error instanceof Error ? error.message : ...` fallback
  // straight to the client on a 500 - the exact information-disclosure
  // pattern this test exists to catch, just never extended to check them.
  new URL("../app/api/ai/cover-letter/route.ts", import.meta.url),
  new URL("../app/api/ai/cv-enrich/route.ts", import.meta.url),
  new URL("../app/api/ai/tailor-cv/route.ts", import.meta.url),
  new URL("../app/api/ai/work-authorisation/route.ts", import.meta.url),
  // Same bug, found in the mobility-governance write paths during a
  // follow-up 2026-09-17 audit - these five had it too, and (unlike the
  // admin mobility routes, which already use a distinct safeAdminError
  // helper) had never been checked here.
  new URL("../app/api/mobility/decisions/[decisionId]/route.ts", import.meta.url),
  new URL("../app/api/mobility/decisions/[decisionId]/actions/route.ts", import.meta.url),
  new URL("../app/api/mobility/learning/comprehension/route.ts", import.meta.url),
  new URL("../app/api/mobility/learning/consent/route.ts", import.meta.url),
  new URL("../app/api/mobility/learning/events/route.ts", import.meta.url),
  // Found in a follow-up sweep across every route.ts matching the same
  // literal pattern regardless of prior test coverage - these six had the
  // identical raw error.message-to-client bug, previously unchecked here.
  new URL("../app/api/profile/onboarding/route.ts", import.meta.url),
  new URL("../app/api/outreach/route.ts", import.meta.url),
  new URL("../app/api/esco/questionnaire/route.ts", import.meta.url),
  new URL("../app/api/esco/score-job/route.ts", import.meta.url),
  new URL("../app/api/esco/import-evidence/route.ts", import.meta.url),
  new URL("../app/api/cv/github/route.ts", import.meta.url),
]) {
  const source = await readFile(route, "utf8")
  assert.doesNotMatch(source, /data:\s*null,\s*error:\s*error\s+instanceof\s+Error/)
}

console.log("PASS API diagnostic responses redact internal 5xx details")
