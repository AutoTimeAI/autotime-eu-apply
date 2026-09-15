import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
const source = fs.readFileSync("supabase/migrations/20260912140000_mobility_readiness_ledger.sql", "utf8")
const registry = fs.readFileSync("supabase/migrations/20260912120000_mobility_evidence_registry.sql", "utf8")
test("readiness ledger is transactional and append-only", () => {
  assert.match(source, /^--[\s\S]*?begin;/i); assert.match(source, /commit;\s*$/i)
  assert.equal((source.match(/before update or delete/gi) ?? []).length, 2)
  assert.equal((source.match(/enable row level security/gi) ?? []).length, 2)
  assert.equal((source.match(/revoke all on public\./gi) ?? []).length, 2)
  const triggerFunction = source.match(/execute function public\.(reject_mobility_[a-z_]+)\(\)/i)?.[1]
  assert.ok(triggerFunction)
  assert.match(registry, new RegExp(`create function public\\.${triggerFunction}\\(\\)`, "i"))
})
test("material changes and outages fail closed", () => {
  assert.match(source, /'unavailable', 'material_content', 'pipeline_changed'/i)
  assert.match(source, /or \(quarantine and review_required\)/i)
})
test("definitive output requires approved state and expert sign-off", () => {
  assert.match(source, /output_permission <> 'definitive'/i)
  assert.match(source, /state = 'approved' and expert_signoff_id is not null/i)
})
