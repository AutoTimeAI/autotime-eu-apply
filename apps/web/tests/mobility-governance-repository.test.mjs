import assert from "node:assert/strict"
import test from "node:test"
import { isMobilityGovernanceEnforcementEnabled, loadCurrentMobilityReadiness, resolveGovernanceCountryCode } from "../platform/application-preparation/mobility-governance-repository.ts"

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
function client(result, calls = []) {
  const chain = {
    select(value) { calls.push(["select", value]); return chain },
    eq(column, value) { calls.push(["eq", column, value]); return chain },
    order(column, value) { calls.push(["order", column, value]); return chain },
    limit(value) { calls.push(["limit", value]); return chain },
    async maybeSingle() { return result },
  }
  return { calls, from(table) { calls.push(["from", table]); return chain } }
}

test("normalises governed market names without guessing unknown countries", () => {
  assert.equal(resolveGovernanceCountryCode("Germany"), "DE")
  assert.equal(resolveGovernanceCountryCode("nl"), "NL")
  assert.equal(resolveGovernanceCountryCode("Belgium"), null)
})

test("enforcement is opt-in and accepts only explicit true", () => {
  assert.equal(isMobilityGovernanceEnforcementEnabled(undefined), false)
  assert.equal(isMobilityGovernanceEnforcementEnabled("false"), false)
  assert.equal(isMobilityGovernanceEnforcementEnabled("true"), true)
})

test("loads the newest readiness snapshot and preserves bundle/sign-off lineage", async () => {
  const db = client({ error: null, data: {
    id: id(1), rule_bundle_version_id: id(2), expert_signoff_id: id(3),
    state: "approved", score: 100, output_permission: "definitive",
    reason_codes: [], evaluated_at: "2026-09-12T12:00:00.000Z",
    mobility_rule_bundle_versions: { rules: { formatVersion: 1 } },
  } })
  const result = await loadCurrentMobilityReadiness(db, "Germany")
  assert.equal(result.ruleBundleVersionId, id(2))
  assert.equal(result.readiness.outputPermission, "definitive")
  assert.deepEqual(result.executableRules, { formatVersion: 1 })
  assert.deepEqual(db.calls.at(-1), ["limit", 1])
})

test("missing snapshot remains explicit", async () => {
  assert.equal(await loadCurrentMobilityReadiness(client({ error: null, data: null }), "DE"), null)
})

test("database errors are redacted", async () => {
  await assert.rejects(
    loadCurrentMobilityReadiness(client({ data: null, error: { message: "secret detail" } }), "DE"),
    /^Error: Mobility governance readiness could not be loaded$/,
  )
})
