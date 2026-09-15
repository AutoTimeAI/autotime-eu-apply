import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const path =
  "supabase/migrations/20260912120000_mobility_evidence_registry.sql"
const source = fs.readFileSync(path, "utf8")

function executableSql(value) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ")
    .replace(/'(?:''|[^'])*'/g, "''")
}

function statements(value) {
  return executableSql(value)
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
}

test("registry migration is additive and transactional", () => {
  const sql = executableSql(source)
  const parsed = statements(source)
  assert.match(sql, /^\s*begin\s*;/i)
  assert.match(sql, /commit\s*;\s*$/i)
  assert.equal(parsed.filter((statement) => /^(drop|truncate|delete)\b/i.test(statement)).length, 0)
  assert.equal(
    parsed.filter((statement) =>
      /^alter\s+table\b[\s\S]*\b(drop|rename|alter\s+column)\b/i.test(statement)
    ).length,
    0
  )
  assert.doesNotMatch(sql, /create\s+table\s+if\s+not\s+exists/i)
  assert.equal((sql.match(/create table public\./gi) ?? []).length, 11)
})

test("all registry tables are append-only and unavailable to browser roles", () => {
  assert.match(source, /before update or delete/i)
  assert.match(source, /reject_mobility_immutable_mutation/i)
  assert.match(source, /enable row level security/i)
  assert.match(source, /revoke all on public\.%I from anon, authenticated/i)
  assert.doesNotMatch(source, /create policy/i)
})

test("source versions preserve hashes snapshots and distinct time fields", () => {
  assert.match(source, /raw_sha256 text not null/i)
  assert.match(source, /normalized_sha256 text not null/i)
  assert.match(source, /snapshot_uri text not null/i)
  assert.match(source, /retrieved_at timestamptz not null/i)
  assert.match(source, /published_at timestamptz/i)
  assert.match(source, /effective_from timestamptz/i)
  assert.match(source, /effective_to timestamptz/i)
  assert.match(source, /expires_at timestamptz/i)
})

test("successor versions require lineage and active bundles are unique", () => {
  assert.equal((source.match(/constraint mobility_.*_lineage check/gi) ?? []).length, 2)
  assert.match(source, /where state = 'active'/i)
  assert.match(source, /mobility_rule_claim_links/i)
  assert.match(source, /mobility_expert_signoffs/i)
})
