import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const versions = ["20260912120000", "20260912130000", "20260912140000", "20260912150000", "20260912160000"]
const migrations = versions.map((version) => ({ version, source: fs.readFileSync(`supabase/migrations/${version}_${({"20260912120000":"mobility_evidence_registry","20260912130000":"mobility_decision_provenance","20260912140000":"mobility_readiness_ledger","20260912150000":"mobility_learning_lineage","20260912160000":"mobility_learning_experiments"})[version]}.sql`, "utf8") }))
const combined = migrations.map((item) => item.source).join("\n")
const preflight = fs.readFileSync("supabase/preflight/20260912160000_mobility_moat_foundation_readonly.sql", "utf8")

test("migration chain is ordered, transactional and non-destructive", () => {
  assert.deepEqual([...versions].sort(), versions)
  for (const migration of migrations) {
    assert.match(migration.source, /\bbegin;/i, migration.version)
    assert.match(migration.source, /commit;\s*$/i, migration.version)
    assert.doesNotMatch(migration.source, /\b(drop table|truncate)\b/i, migration.version)
  }
})

test("every referenced mobility trigger function exists earlier in the chain", () => {
  const created = new Set()
  for (const { version, source } of migrations) {
    for (const match of source.matchAll(/create function public\.(\w+)\s*\(|execute function public\.(\w+)\(\)/gi)) {
      if (match[1]) created.add(match[1])
      if (match[2]) assert.ok(created.has(match[2]), `${version} references ${match[2]} before it is created`)
    }
  }
})

test("read-only preflight covers every mobility table and migration", () => {
  const createdTables = [...combined.matchAll(/create table public\.(mobility_\w+)/gi)].map((match) => match[1])
  assert.equal(new Set(createdTables).size, 30)
  for (const table of createdTables) assert.match(preflight, new RegExp(`\\('${table}'\\)`))
  for (const version of versions) assert.match(preflight, new RegExp(version))
  assert.doesNotMatch(preflight, /\b(insert|update|delete|alter|drop|truncate)\b/i)
})
