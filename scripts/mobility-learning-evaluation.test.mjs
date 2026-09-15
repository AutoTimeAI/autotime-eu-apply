import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import { evaluateLearningExperiment } from "../packages/shared/src/evidence/learning-evaluation.ts"
const migration = fs.readFileSync("supabase/migrations/20260912160000_mobility_learning_experiments.sql", "utf8")
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`
const sample = (variant, index, overrides = {}) => ({ assignmentId: id(index), decisionId: id(index + 5000), variant, recommendedAction: "apply", observedAction: "applied", outcome: "interview", expertSafe: true, userUnderstood: true, consentValid: true, ...overrides })

test("experiment ledger freezes protocols, assignments, events and results", () => {
  assert.equal((migration.match(/create table public\./gi) ?? []).length, 4)
  assert.equal((migration.match(/before update or delete/gi) ?? []).length, 4)
  assert.equal((migration.match(/enable row level security/gi) ?? []).length, 4)
  assert.match(migration, /unique \(experiment_id, user_id\)/i)
  assert.match(migration, /dataset_cutoff_at timestamptz not null/i)
})

test("rollout is blocked when sample size is insufficient", () => {
  const result = evaluateLearningExperiment([sample("control", 1), sample("treatment", 2)])
  assert.equal(result.eligibleForRollout, false)
  assert.ok(result.reasonCodes.includes("INSUFFICIENT_SAMPLE"))
})

test("any harmful false assurance blocks rollout", () => {
  const cases = [...Array.from({ length: 20 }, (_, i) => sample("control", i + 1, { observedAction: "skipped" })), ...Array.from({ length: 20 }, (_, i) => sample("treatment", i + 101)), sample("treatment", 999, { expertSafe: false })]
  const result = evaluateLearningExperiment(cases)
  assert.equal(result.eligibleForRollout, false)
  assert.ok(result.reasonCodes.includes("HARMFUL_FALSE_ASSURANCE"))
})

test("safe treatment needs comprehension and action-alignment lift", () => {
  const control = Array.from({ length: 20 }, (_, i) => sample("control", i + 1, { observedAction: i < 10 ? "applied" : "skipped" }))
  const treatment = Array.from({ length: 20 }, (_, i) => sample("treatment", i + 101))
  const result = evaluateLearningExperiment([...control, ...treatment])
  assert.equal(result.eligibleForRollout, true)
  assert.equal(result.treatment.comprehensionRate, 1)
  assert.ok(result.treatment.actionAlignmentRate > result.control.actionAlignmentRate)
})

test("invalid-consent cases never contribute to metrics", () => {
  const result = evaluateLearningExperiment([sample("treatment", 1, { consentValid: false, expertSafe: false })], 1)
  assert.equal(result.treatment.validCases, 0)
  assert.equal(result.treatment.harmfulFalseAssuranceRate, 0)
  assert.equal(result.treatment.disagreementRate, 0)
})

test("correction outcomes quantify disagreement without inventing causal lift", () => {
  const result = evaluateLearningExperiment([
    sample("treatment", 1, { correctionOutcome: "accepted" }),
    sample("treatment", 2, { correctionOutcome: "rejected" }),
    sample("treatment", 3),
  ], 1)
  assert.equal(result.treatment.disagreementRate, 2 / 3)
  assert.equal(result.treatment.acceptedCorrectionRate, 1 / 2)
  assert.equal(Object.hasOwn(result.treatment, "causalImpact"), false)
})

test("no disagreement produces an explicit zero rate and no misleading acceptance denominator", () => {
  const result = evaluateLearningExperiment([sample("control", 1)], 1)
  assert.equal(result.control.disagreementRate, 0)
  assert.equal(result.control.acceptedCorrectionRate, null)
})
