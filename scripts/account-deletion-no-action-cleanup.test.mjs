import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// Found 2026-09-20 by querying pg_constraint directly against production:
// four tables' user_id foreign key to auth.users is ON DELETE NO ACTION,
// not CASCADE, despite this route's own prior comment claiming "every
// per-user table... has ON DELETE CASCADE". Left unhandled, deleting the
// auth user would raise a foreign-key violation and the whole account
// deletion (GDPR Article 17) would fail outright for any user who has
// ever had a row in any of these - seen_job_postings alone already held
// one real user's rows in production. This locks in that the route
// explicitly cleans these up before calling deleteUser, so a future
// refactor can't silently drop that step and reintroduce the failure.
const source = readFileSync(
  new URL("../apps/web/app/api/account/route.ts", import.meta.url),
  "utf8",
)

const tests = []
function test(name, run) {
  tests.push({ name, run })
}

const noActionTables = [
  "tracked_jobs",
  "custom_sponsor_companies",
  "seen_job_postings",
  "capture_handoffs",
]

for (const table of noActionTables) {
  test(`the deletion route explicitly cleans up "${table}" (ON DELETE NO ACTION, not CASCADE)`, () => {
    assert.match(source, new RegExp(`"${table}"`))
  })
}

test("the NO ACTION cleanup runs before deleteUser, not after", () => {
  const cleanupIndex = source.indexOf("deleteNoActionOwnedRows(adminClient")
  const deleteUserIndex = source.indexOf("adminClient.auth.admin.deleteUser")
  assert.ok(cleanupIndex > -1, "deleteNoActionOwnedRows call not found")
  assert.ok(deleteUserIndex > -1, "deleteUser call not found")
  assert.ok(
    cleanupIndex < deleteUserIndex,
    "NO ACTION table cleanup must happen before deleteUser is called",
  )
})

test("a NO ACTION cleanup failure throws rather than being silently swallowed", () => {
  // Unlike deleteProfilePhotos (storage has no FK, so best-effort is
  // correct there), a failure here must surface as a deletion failure -
  // the very next line would hit the identical constraint violation
  // anyway, so silently continuing only produces a worse, less
  // diagnosable error one step later.
  const start = source.indexOf("async function deleteNoActionOwnedRows")
  assert.ok(start > -1, "deleteNoActionOwnedRows function not found")
  const nextDeclaration = source.indexOf("\ntype ", start)
  const fnBody = source.slice(start, nextDeclaration > -1 ? nextDeclaration : undefined)
  assert.match(fnBody, /throw new Error/)
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
if (failed > 0) process.exitCode = 1
