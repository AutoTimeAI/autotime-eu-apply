import assert from "node:assert/strict"
import test from "node:test"
import { deriveCountryReadiness } from "../packages/shared/src/evidence/readiness.ts"
const ready = { countryCode: "DE", sourceChainComplete: true, criticalSourcesFresh: true, unresolvedContradictions: 0, evaluationCasesPassed: true, independentReviewPassed: true, expertSignoff: "approved", signoffValidUntil: "2027-01-01T00:00:00.000Z", activeIncident: false, requestedAt: "2026-09-12T00:00:00.000Z" }
test("complete reviewed evidence permits definitive output", () => assert.equal(deriveCountryReadiness(ready).outputPermission, "definitive"))
test("expired sign-off demotes to information only", () => { const r = deriveCountryReadiness({ ...ready, signoffValidUntil: "2026-09-11T00:00:00.000Z" }); assert.equal(r.state, "information_only"); assert.ok(r.reasonCodes.includes("EXPERT_SIGNOFF_EXPIRED")) })
test("stale source cannot produce definitive output", () => assert.equal(deriveCountryReadiness({ ...ready, criticalSourcesFresh: false }).outputPermission, "information_only"))
test("contradictions and failed evaluations block", () => { assert.equal(deriveCountryReadiness({ ...ready, unresolvedContradictions: 1 }).outputPermission, "blocked"); assert.equal(deriveCountryReadiness({ ...ready, evaluationCasesPassed: false }).outputPermission, "blocked") })
test("incident and withdrawn sign-off quarantine", () => { assert.equal(deriveCountryReadiness({ ...ready, activeIncident: true }).state, "quarantined"); assert.equal(deriveCountryReadiness({ ...ready, expertSignoff: "withdrawn" }).state, "quarantined") })
