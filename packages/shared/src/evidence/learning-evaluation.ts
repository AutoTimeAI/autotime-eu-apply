import { z } from "zod"

export const learningEvaluationCaseSchema = z.object({
  assignmentId: z.string().uuid(), decisionId: z.string().uuid(), variant: z.enum(["control", "treatment"]),
  recommendedAction: z.enum(["apply", "investigate", "skip"]),
  observedAction: z.enum(["applied", "investigated", "skipped", "unknown"]),
  outcome: z.enum(["interview", "offer", "rejected", "withdrawn", "no_response", "unknown"]),
  correctionOutcome: z.enum(["none", "pending", "accepted", "rejected"]).default("none"),
  expertSafe: z.boolean(), userUnderstood: z.boolean().nullable(), consentValid: z.boolean(),
})
export type LearningEvaluationCase = z.infer<typeof learningEvaluationCaseSchema>
export interface LearningVariantMetrics {
  assignments: number; validCases: number; comprehensionRate: number | null;
  harmfulFalseAssuranceRate: number; interviewOrOfferRate: number | null;
  actionAlignmentRate: number | null;
  disagreementRate: number; acceptedCorrectionRate: number | null;
}
export interface LearningEvaluationResult {
  control: LearningVariantMetrics; treatment: LearningVariantMetrics;
  eligibleForRollout: boolean; reasonCodes: string[];
}

function metrics(cases: LearningEvaluationCase[], variant: "control" | "treatment"): LearningVariantMetrics {
  const assigned = cases.filter((item) => item.variant === variant)
  const valid = assigned.filter((item) => item.consentValid)
  const understood = valid.filter((item) => item.userUnderstood !== null)
  const outcomes = valid.filter((item) => item.outcome !== "unknown")
  const aligned = valid.filter((item) => item.observedAction !== "unknown")
  const harmful = valid.filter((item) => item.recommendedAction === "apply" && !item.expertSafe)
  const disagreements = valid.filter((item) => item.correctionOutcome !== "none")
  return {
    assignments: assigned.length,
    validCases: valid.length,
    comprehensionRate: understood.length ? understood.filter((item) => item.userUnderstood).length / understood.length : null,
    harmfulFalseAssuranceRate: valid.length ? harmful.length / valid.length : 0,
    interviewOrOfferRate: outcomes.length ? outcomes.filter((item) => item.outcome === "interview" || item.outcome === "offer").length / outcomes.length : null,
    actionAlignmentRate: aligned.length ? aligned.filter((item) =>
      (item.recommendedAction === "apply" && item.observedAction === "applied") ||
      (item.recommendedAction === "investigate" && item.observedAction === "investigated") ||
      (item.recommendedAction === "skip" && item.observedAction === "skipped")
    ).length / aligned.length : null,
    disagreementRate: valid.length ? disagreements.length / valid.length : 0,
    acceptedCorrectionRate: disagreements.length
      ? disagreements.filter((item) => item.correctionOutcome === "accepted").length / disagreements.length
      : null,
  }
}

export function evaluateLearningExperiment(rawCases: LearningEvaluationCase[], minimumPerVariant = 20): LearningEvaluationResult {
  const cases = z.array(learningEvaluationCaseSchema).parse(rawCases)
  const control = metrics(cases, "control"); const treatment = metrics(cases, "treatment")
  const reasons: string[] = []
  if (control.validCases < minimumPerVariant || treatment.validCases < minimumPerVariant) reasons.push("INSUFFICIENT_SAMPLE")
  if (treatment.harmfulFalseAssuranceRate > 0) reasons.push("HARMFUL_FALSE_ASSURANCE")
  if (treatment.comprehensionRate === null || treatment.comprehensionRate < 0.8) reasons.push("COMPREHENSION_BELOW_GATE")
  if (control.actionAlignmentRate === null || treatment.actionAlignmentRate === null || treatment.actionAlignmentRate <= control.actionAlignmentRate) reasons.push("NO_ACTION_ALIGNMENT_LIFT")
  return { control, treatment, eligibleForRollout: reasons.length === 0, reasonCodes: reasons.sort() }
}
