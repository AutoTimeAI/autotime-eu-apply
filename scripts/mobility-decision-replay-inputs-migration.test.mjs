import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync(
  "supabase/migrations/20260912220000_mobility_decision_replay_inputs.sql",
  "utf8",
)

test("exactly one envelope per decision", () => {
  assert.match(source, /decision_id uuid not null unique references public\.mobility_decision_records\(id\) on delete cascade/i)
})

test("envelope is reference-only: candidate evidence and external assessment id arrays, no payload columns", () => {
  assert.match(source, /candidate_evidence_version_ids uuid\[\] not null default '\{\}'/i)
  assert.match(source, /external_assessment_snapshot_ids uuid\[\] not null default '\{\}'/i)
  assert.doesNotMatch(source, /encrypted_payload_reference/i)
})

test("envelope cannot be updated but is deletable, matching mobility_decision_records itself", () => {
  assert.match(source, /before update on public\.mobility_decision_replay_inputs/i)
  assert.doesNotMatch(source, /before update or delete on public\.mobility_decision_replay_inputs/i)
})
