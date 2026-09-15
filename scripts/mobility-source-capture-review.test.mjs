import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const migration = fs.readFileSync("supabase/migrations/20260912270000_mobility_source_capture_reviews.sql", "utf8")
const route = fs.readFileSync("apps/web/app/api/admin/mobility-sources/review/route.ts", "utf8")

test("capture reviews are append-only and limited to capture integrity", () => {
  assert.match(migration, /scope text not null check \(scope = 'capture_integrity'\)/i)
  assert.match(migration, /before update or delete/i)
  assert.match(migration, /accepted_for_claim_review.*rejected/i)
  assert.doesNotMatch(migration, /state = 'approved'|output_permission = 'definitive'/i)
})

test("the database independently requires an active owner or admin", () => {
  assert.match(migration, /status = 'active' and role in \('owner', 'admin'\)/i)
  assert.match(migration, /source event has no archived observed version/i)
  assert.match(migration, /mobility_source_capture_reviewed/i)
})

test("the review route requires permission, same origin, confirmation, and structured reasons", () => {
  assert.match(route, /mobility_sources:review/)
  assert.match(route, /isSameOriginMutation/)
  assert.match(route, /confirm: z\.literal\(true\)/)
  assert.match(route, /\^\[A-Z0-9_\]\+\$/)
})
