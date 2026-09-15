import { z } from "zod"

const scalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const conditionSchema = z.object({
  fact: z.string().trim().min(1).max(120),
  operator: z.enum(["equals", "not_equals", "gte", "gt", "lte", "lt", "in", "present"]),
  value: z.union([scalarSchema, z.array(scalarSchema).min(1)]).optional(),
})
const outcomeSchema = z.enum(["potential_match", "not_supported", "insufficient_evidence", "source_conflict", "employer_unverified", "ruleset_quarantined", "expert_review_required", "information_only", "review_required"])
export const executableMobilityRuleBundleSchema = z.object({
  formatVersion: z.literal(1),
  rules: z.array(z.object({ id: z.string().trim().min(1).max(160), all: z.array(conditionSchema).min(1), outcome: outcomeSchema })).min(1),
  defaultOutcome: outcomeSchema,
})
export const mobilityEvaluationFixtureSchema = z.object({
  caseId: z.string().trim().min(1).max(160),
  facts: z.record(z.string(), scalarSchema),
  expectedState: outcomeSchema,
})
export type ExecutableMobilityRuleBundle = z.infer<typeof executableMobilityRuleBundleSchema>
export type MobilityEvaluationFixture = z.infer<typeof mobilityEvaluationFixtureSchema>

function matches(actual: unknown, operator: z.infer<typeof conditionSchema>["operator"], expected: unknown): boolean {
  if (operator === "present") return actual !== undefined && actual !== null && actual !== ""
  if (operator === "equals") return actual === expected
  if (operator === "not_equals") return actual !== expected
  if (operator === "in") return Array.isArray(expected) && expected.includes(actual as never)
  if (typeof actual !== "number" || typeof expected !== "number") return false
  if (operator === "gte") return actual >= expected
  if (operator === "gt") return actual > expected
  if (operator === "lte") return actual <= expected
  return actual < expected
}

export function evaluateMobilityRuleCase(rawBundle: unknown, rawFixture: unknown): {
  caseId: string; expectedState: string; actualState: string; passed: boolean; matchedRuleId: string | null
} {
  const bundle = executableMobilityRuleBundleSchema.parse(rawBundle)
  const fixture = mobilityEvaluationFixtureSchema.parse(rawFixture)
  const matched = bundle.rules.find((rule) => rule.all.every((condition) => matches(fixture.facts[condition.fact], condition.operator, condition.value)))
  const actualState = matched?.outcome ?? bundle.defaultOutcome
  return { caseId: fixture.caseId, expectedState: fixture.expectedState, actualState, passed: actualState === fixture.expectedState, matchedRuleId: matched?.id ?? null }
}
