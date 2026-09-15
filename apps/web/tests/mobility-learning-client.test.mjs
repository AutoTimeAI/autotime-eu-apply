import assert from "node:assert/strict"
import test from "node:test"
import { emitMobilityLearningEvent, readLearningConsent, setLearningConsent, submitMobilityComprehension } from "../lib/mobility-learning-client.ts"

function storage(initial = null) {
  let value = initial
  return { getItem: () => value, setItem: (_key, next) => { value = next } }
}

test("learning preference is isolated by user-scoped storage and policy version", () => {
  const store = storage(JSON.stringify({ consentId: "consent-1", enabled: true, policyVersion: "2026-09" }))
  assert.equal(readLearningConsent(store, "user-1")?.enabled, true)
  assert.equal(readLearningConsent(storage("bad json"), "user-1"), null)
})

test("grant and revoke send explicit scoped consent actions", async () => {
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (_url, init) => { calls.push(JSON.parse(init.body)); return { ok: true, json: async () => ({ data: { id: `consent-${calls.length}` }, error: null }) } }
  try {
    const store = storage()
    assert.equal((await setLearningConsent(store, "user-1", true)).enabled, true)
    assert.equal((await setLearningConsent(store, "user-1", false)).enabled, false)
    assert.equal(calls[0].action, "grant"); assert.equal(calls[0].scopes.length, 4)
    assert.deepEqual(calls[1], { action: "revoke", policyVersion: "2026-09", scopes: [] })
  } finally { globalThis.fetch = originalFetch }
})

test("event emitter sends only the bounded linkage contract", async () => {
  const originalFetch = globalThis.fetch
  let sent
  globalThis.fetch = async (_url, init) => { sent = JSON.parse(init.body); return { ok: true } }
  try {
    await emitMobilityLearningEvent({ consentId: "00000000-0000-4000-8000-000000000001", decisionId: "00000000-0000-4000-8000-000000000002", applicationId: "00000000-0000-4000-8000-000000000003", eventType: "applied", evidenceClass: "observed", occurredAt: "2026-09-12T12:00:00.000Z" })
    assert.deepEqual(Object.keys(sent).sort(), ["applicationId", "consentId", "correctionId", "decisionId", "eventType", "evidenceClass", "occurredAt", "outcomeRecordId"].sort())
  } finally { globalThis.fetch = originalFetch }
})

test("consented correction events carry only the correction identifier", async () => {
  const originalFetch = globalThis.fetch
  let sent
  globalThis.fetch = async (_url, init) => { sent = JSON.parse(init.body); return { ok: true } }
  try {
    await emitMobilityLearningEvent({ consentId: "00000000-0000-4000-8000-000000000001", decisionId: "00000000-0000-4000-8000-000000000002", correctionId: "00000000-0000-4000-8000-000000000004", eventType: "correction_submitted", evidenceClass: "user_reported", occurredAt: "2026-09-12T12:00:00.000Z" })
    assert.equal(sent.correctionId, "00000000-0000-4000-8000-000000000004")
    assert.equal(sent.eventType, "correction_submitted")
    assert.equal(Object.hasOwn(sent, "reason"), false)
  } finally { globalThis.fetch = originalFetch }
})

test("clarity feedback uses the dedicated bounded endpoint", async () => {
  const originalFetch = globalThis.fetch; let sent; let url
  globalThis.fetch = async (nextUrl, init) => { url = nextUrl; sent = JSON.parse(init.body); return { ok: true, json: async () => ({ data: { id: "response-1" } }) } }
  try {
    await submitMobilityComprehension({ consentId: "00000000-0000-4000-8000-000000000001", decisionId: "00000000-0000-4000-8000-000000000002", understood: false, reasonCode: "UNCLEAR_ACTION" })
    assert.equal(url, "/api/mobility/learning/comprehension"); assert.equal(sent.reasonCode, "UNCLEAR_ACTION"); assert.equal(Object.hasOwn(sent, "notes"), false)
  } finally { globalThis.fetch = originalFetch }
})
