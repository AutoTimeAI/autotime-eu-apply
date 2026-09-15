import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const path =
  "supabase/migrations/20260912130000_mobility_decision_provenance.sql"
const source = fs.readFileSync(path, "utf8")

test("decision provenance migration creates the complete version graph", () => {
  assert.equal((source.match(/create table public\./gi) ?? []).length, 11)
  for (const table of [
    "mobility_candidate_evidence_versions",
    "mobility_vacancy_snapshots",
    "mobility_employer_register_versions",
    "mobility_employer_register_rows",
    "mobility_employer_verifications",
    "mobility_decision_records",
    "mobility_decision_evidence_links",
    "mobility_decision_corrections",
    "mobility_decision_replays"
  ]) {
    assert.match(source, new RegExp(`create table public\\.${table}`, "i"))
  }
})

test("canonical personal provenance is update-immutable but remains deletable", () => {
  const immutableBlock = source.match(
    /do \$immutable_updates\$[\s\S]*?\$immutable_updates\$;/i
  )?.[0]
  assert.ok(immutableBlock)
  assert.match(source, /before update on public\.%I/i)
  assert.doesNotMatch(source, /before update or delete on public\.%I/i)
  assert.match(source, /references auth\.users\(id\) on delete cascade/gi)
  assert.match(immutableBlock, /revoke all on public\.%I from anon, authenticated/i)
  assert.doesNotMatch(immutableBlock, /mobility_decision_corrections/i)
  assert.doesNotMatch(immutableBlock, /mobility_decision_replays/i)
  assert.match(source, /alter table public\.mobility_decision_corrections enable row level security/i)
  assert.match(source, /alter table public\.mobility_decision_replays enable row level security/i)
})

test("verified employers require exact register evidence", () => {
  assert.match(source, /state <> 'verified'/i)
  assert.match(source, /exact_legal_identifier/i)
  assert.match(source, /exact_legal_name/i)
  assert.doesNotMatch(source, /fuzzy/i)
})

test("decisions preserve canonical output correction and replay lineage", () => {
  assert.match(source, /canonical_output_sha256 text not null/i)
  assert.match(source, /supersedes_decision_id uuid/i)
  assert.match(source, /original_decision_id uuid not null/i)
  assert.match(source, /idempotency_key text not null unique/i)
  assert.match(source, /original_versions.*successor_comparison/i)
})
