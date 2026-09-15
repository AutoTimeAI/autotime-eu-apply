import { z } from "zod"

export const countryReadinessStateSchema = z.enum(["quarantined", "research", "information_only", "conditional", "approved"])
export const expertSignoffStateSchema = z.enum(["absent", "pending", "approved", "rejected", "expired", "withdrawn"])
export const readinessInputSchema = z.object({
  countryCode: z.string().trim().length(2).transform((v) => v.toUpperCase()),
  sourceChainComplete: z.boolean(), criticalSourcesFresh: z.boolean(),
  unresolvedContradictions: z.number().int().nonnegative(), evaluationCasesPassed: z.boolean(),
  independentReviewPassed: z.boolean(), expertSignoff: expertSignoffStateSchema,
  signoffValidUntil: z.string().datetime().nullable(), activeIncident: z.boolean(), requestedAt: z.string().datetime()
})
export type ReadinessInput = z.infer<typeof readinessInputSchema>
export type CountryReadinessState = z.infer<typeof countryReadinessStateSchema>
export interface ReadinessResult { state: CountryReadinessState; score: number; outputPermission: "blocked" | "information_only" | "conditional" | "definitive"; reasonCodes: string[] }

export function deriveCountryReadiness(raw: ReadinessInput): ReadinessResult {
  const x = readinessInputSchema.parse(raw)
  const expired = x.expertSignoff === "approved" && (!x.signoffValidUntil || Date.parse(x.signoffValidUntil) <= Date.parse(x.requestedAt))
  const reasons: string[] = []
  if (!x.sourceChainComplete) reasons.push("SOURCE_CHAIN_INCOMPLETE")
  if (!x.criticalSourcesFresh) reasons.push("CRITICAL_SOURCE_STALE")
  if (x.unresolvedContradictions) reasons.push("UNRESOLVED_CONTRADICTION")
  if (!x.evaluationCasesPassed) reasons.push("EVALUATION_GATE_FAILED")
  if (!x.independentReviewPassed) reasons.push("INDEPENDENT_REVIEW_MISSING")
  if (x.activeIncident) reasons.push("ACTIVE_SAFETY_INCIDENT")
  if (expired) reasons.push("EXPERT_SIGNOFF_EXPIRED")
  else if (x.expertSignoff !== "approved") reasons.push(`EXPERT_SIGNOFF_${x.expertSignoff.toUpperCase()}`)
  let score = 100
  if (!x.sourceChainComplete) score -= 30
  if (!x.criticalSourcesFresh) score -= 25
  if (x.unresolvedContradictions) score -= 30
  if (!x.evaluationCasesPassed) score -= 20
  if (!x.independentReviewPassed) score -= 10
  if (x.expertSignoff !== "approved" || expired) score -= 20
  if (x.activeIncident) score -= 50
  score = Math.max(0, score)
  const result = (state: CountryReadinessState, outputPermission: ReadinessResult["outputPermission"]): ReadinessResult => ({ state, score, outputPermission, reasonCodes: reasons.sort() })
  if (x.activeIncident || x.expertSignoff === "rejected" || x.expertSignoff === "withdrawn") return result("quarantined", "blocked")
  if (!x.sourceChainComplete || x.unresolvedContradictions > 0 || !x.evaluationCasesPassed) return result("research", "blocked")
  if (!x.criticalSourcesFresh || expired || x.expertSignoff !== "approved") return result("information_only", "information_only")
  if (!x.independentReviewPassed) return result("conditional", "conditional")
  return result("approved", "definitive")
}
