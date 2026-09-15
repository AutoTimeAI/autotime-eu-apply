import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync(
  "supabase/migrations/20260912210000_mobility_external_assessment_snapshots.sql",
  "utf8",
)

test("snapshot table is fully immutable like the rest of the evidence registry", () => {
  assert.match(source, /before update or delete on public\.mobility_external_assessment_snapshots/i)
  assert.match(source, /execute function public\.reject_mobility_immutable_mutation/i)
  assert.match(source, /revoke all on public\.mobility_external_assessment_snapshots from anon, authenticated/i)
})

test("stores hashed request/response, not raw payloads", () => {
  assert.match(source, /request_sha256 text not null check \(request_sha256 ~/i)
  assert.match(source, /response_sha256 text not null check \(response_sha256 ~/i)
})

test("uncovered checks cannot carry an assessment payload", () => {
  assert.match(source, /mobility_external_assessment_snapshots_coverage_consistency check \(\s*covered or assessment is null/i)
})
