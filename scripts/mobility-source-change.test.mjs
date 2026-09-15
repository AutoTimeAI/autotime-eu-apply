import assert from "node:assert/strict"
import test from "node:test"
import { classifySourceChange } from "../packages/shared/src/evidence/change-detection.ts"
const hash = (c) => c.repeat(64)
const prior = { available: true, httpStatus: 200, rawSha256: hash("a"), normalizedSha256: hash("b"), parserVersion: "1", normalizerVersion: "1" }
test("unchanged observation stays usable", () => assert.equal(classifySourceChange(prior, prior).classification, "unchanged"))
test("presentation-only change is not material", () => { const r = classifySourceChange(prior, { ...prior, rawSha256: hash("c") }); assert.equal(r.classification, "transport_only"); assert.equal(r.quarantine, false) })
test("normalized change quarantines", () => { const r = classifySourceChange(prior, { ...prior, normalizedSha256: hash("c") }); assert.equal(r.classification, "material_content"); assert.equal(r.quarantine, true) })
test("unavailable source fails closed", () => assert.equal(classifySourceChange(prior, { ...prior, available: false, httpStatus: 503, rawSha256: null, normalizedSha256: null }).quarantine, true))
test("pipeline change requires review", () => assert.equal(classifySourceChange(prior, { ...prior, parserVersion: "2" }).classification, "pipeline_changed"))
