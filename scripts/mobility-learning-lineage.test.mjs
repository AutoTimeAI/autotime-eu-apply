import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { mobilityLearningConsentSchema, mobilityLearningEventSchema } from "../packages/shared/src/evidence/learning.ts"

const source = fs.readFileSync("supabase/migrations/20260912150000_mobility_learning_lineage.sql", "utf8")
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

test("learning lineage is transactional, private and update-immutable", () => {
  assert.match(source, /begin;[\s\S]*commit;/i)
  assert.equal((source.match(/enable row level security/gi) ?? []).length, 2)
  assert.equal((source.match(/revoke all on public\.mobility_learning_/gi) ?? []).length, 2)
  assert.equal((source.match(/before update on public\.mobility_learning_/gi) ?? []).length, 2)
  assert.doesNotMatch(source, /before update or delete on public\.mobility_learning_/i)
})

test("event insert validates consent interval, scope and cross-table ownership", () => {
  assert.match(source, /without active referenced consent/i)
  assert.match(source, /order by effective_at desc, version desc limit 1/i)
  assert.match(source, /required_scope = any\(consent_row\.scopes\)/i)
  assert.match(source, /mobility_decision_records where id = new\.decision_id and user_id = new\.user_id/i)
  assert.match(source, /applications where id = new\.application_id and user_id = new\.user_id/i)
  assert.match(source, /outcome_records where id = new\.outcome_record_id and user_id = new\.user_id/i)
})

test("consent successors and revocation intervals are validated", () => {
  assert.match(source, /pg_advisory_xact_lock/i)
  assert.match(source, /coalesce\(previous_row\.version, 0\) \+ 1/i)
  assert.match(source, /previous_row\.id, now\(\)/i)
  assert.doesNotThrow(() => mobilityLearningConsentSchema.parse({ id: id(1), userId: id(2), version: 1, policyVersion: "2026-09", action: "grant", scopes: ["decision_action"], predecessorConsentId: null, effectiveAt: "2026-09-12T10:00:00.000Z" }))
  assert.doesNotThrow(() => mobilityLearningConsentSchema.parse({ id: id(1), userId: id(2), version: 2, policyVersion: "2026-09", action: "revoke", scopes: [], predecessorConsentId: id(1), effectiveAt: "2026-09-12T11:00:00.000Z" }))
  assert.throws(() => mobilityLearningConsentSchema.parse({ id: id(1), userId: id(2), version: 2, policyVersion: "2026-09", action: "grant", scopes: ["decision_action"], predecessorConsentId: null, effectiveAt: "2026-09-12T10:00:00.000Z" }))
})

test("learning events require immutable identity and a content hash", () => {
  assert.doesNotThrow(() => mobilityLearningEventSchema.parse({ id: id(1), userId: id(2), consentId: id(3), decisionId: id(4), applicationId: null, outcomeRecordId: null, correctionId: null, eventType: "decision_viewed", evidenceClass: "observed", payload: {}, eventSha256: "a".repeat(64), occurredAt: "2026-09-12T10:00:00.000Z", idempotencyKey: "decision-viewed:4" }))
  assert.throws(() => mobilityLearningEventSchema.parse({ id: id(1), userId: id(2), consentId: id(3), decisionId: id(4), applicationId: null, outcomeRecordId: null, correctionId: null, eventType: "decision_viewed", evidenceClass: "observed", payload: {}, eventSha256: "not-a-hash", occurredAt: "2026-09-12T10:00:00.000Z", idempotencyKey: "x" }))
})
