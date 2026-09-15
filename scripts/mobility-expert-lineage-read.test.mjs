import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
const route = await readFile(new URL("../apps/web/app/api/mobility/decisions/[decisionId]/route.ts", import.meta.url), "utf8")

test("decision ledger follows the readiness snapshot's exact expert sign-off", () => {
  assert.match(route, /canonicalOutput\?\.readinessSnapshotId/)
  assert.match(route, /mobility_country_readiness_snapshots/)
  assert.match(route, /\.eq\("rule_bundle_version_id", String\(decision\.rule_bundle_version_id\)\)/)
  assert.match(route, /readinessRow\?\.expert_signoff_id/)
  assert.match(route, /\.eq\("id", String\(readinessRow\.expert_signoff_id\)\)/)
  assert.doesNotMatch(route, /mobility_expert_signoffs[\s\S]{0,300}\.eq\("rule_bundle_version_id"/)
})

test("reviewer identity remains excluded from the candidate response", () => {
  assert.doesNotMatch(route, /reviewer_name/)
  assert.match(route, /expertSignoffs: signoff\.data \? \[signoff\.data\] : \[\]/)
})
