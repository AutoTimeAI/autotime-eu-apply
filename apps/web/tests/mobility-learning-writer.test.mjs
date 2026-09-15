import assert from "node:assert/strict"
import test from "node:test"
import { appendLearningConsent, appendLearningEvent } from "../platform/mobility-learning/writer.ts"
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
function client({ fail = false } = {}) {
  const calls = []
  return {
    calls,
    from(table) {
      return {
        insert(value) {
          calls.push(["insert", table, value])
          return {
            select() {
              return {
                async single() {
                  return fail
                    ? { data: null, error: {} }
                    : { data: { id: id(9) }, error: null }
                },
              }
            },
          }
        },
      }
    },
    async rpc(name, args) {
      calls.push(["rpc", name, args])
      return fail
        ? { data: null, error: {} }
        : { data: id(8), error: null }
    },
  }
}
const event = { consentId: id(1), decisionId: id(2), applicationId: id(3), eventType: "applied", evidenceClass: "observed", occurredAt: "2026-09-12T12:00:00.000Z" }
test("event identity is deterministic and user ownership is server assigned", async () => {
  const first = client(); const second = client()
  const a = await appendLearningEvent(first, id(4), event); const b = await appendLearningEvent(second, id(4), event)
  assert.equal(a.idempotencyKey, b.idempotencyKey)
  assert.equal(first.calls[0][2].user_id, id(4))
  assert.equal(first.calls[0][2].event_sha256.length, 64)
})
test("event payload rejects arbitrary personal text", async () => {
  await assert.rejects(appendLearningEvent(client(), id(4), { ...event, notes: "private CV contents" }))
})
test("grant and revoke consent use the atomic database function", async () => {
  const db = client()
  await appendLearningConsent(db, id(4), { action: "grant", policyVersion: "2026-09", scopes: ["decision_action"] })
  await appendLearningConsent(db, id(4), { action: "revoke", policyVersion: "2026-09", scopes: [] })
  assert.deepEqual(db.calls.map((call) => call[1]), ["append_mobility_learning_consent", "append_mobility_learning_consent"])
})
test("writer errors do not expose provider details", async () => {
  await assert.rejects(appendLearningEvent(client({ fail: true }), id(4), event), /^Error: Mobility learning event could not be recorded$/)
})
