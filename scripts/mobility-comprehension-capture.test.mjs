import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"
import { appendComprehensionResponse } from "../apps/web/platform/mobility-learning/writer.ts"
const migration = await readFile(new URL("../supabase/migrations/20260912340000_mobility_decision_comprehension.sql", import.meta.url), "utf8")
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

test("comprehension responses are consent-scoped, versioned and immutable", () => {
  assert.match(migration, /mobility_decision_comprehension_no_mutation/)
  assert.match(migration, /active decision-action consent required/)
  assert.match(migration, /latest_consent\.id is distinct from consent\.id/)
  assert.match(migration, /unique\(decision_id, version\)/)
})

test("writer assigns user identity and uses the guarded database function", async () => {
  const calls = []; const client = { from() {}, async rpc(name, args) { calls.push({ name, args }); return { data: id(9), error: null } } }
  await appendComprehensionResponse(client, id(1), { consentId: id(2), decisionId: id(3), understood: false, reasonCode: "UNCLEAR_EVIDENCE", respondedAt: "2026-09-15T12:00:00.000Z" })
  assert.equal(calls[0].name, "append_mobility_decision_comprehension")
  assert.equal(calls[0].args.p_user_id, id(1))
})

test("clear and unclear answers cannot carry contradictory reason codes", async () => {
  const client = { from() {}, async rpc() { return { data: id(9), error: null } } }
  await assert.rejects(appendComprehensionResponse(client, id(1), { consentId: id(2), decisionId: id(3), understood: false, reasonCode: "CLEAR", respondedAt: "2026-09-15T12:00:00.000Z" }))
})
