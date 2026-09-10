import type { EUFitEngineResult } from "../types.ts"

export type FitComponentKey =
  | "skillMatch"
  | "atsCompatibility"
  | "sponsorshipLikelihood"
  | "rightToWorkCompatibility"
  | "relocationFit"
  | "countryLocationFit"

export type FitComponentStatus = "strong" | "medium" | "weak" | "blocker"

export type FitComponent = {
  key: FitComponentKey
  label: string
  score: number
  status: FitComponentStatus
  rationale: string
  evidence: string[]
}

export type CountryFitDecision =
  | "Apply now"
  | "Stretch application"
  | "Skip for now"
  | "Improve profile first"

export type ContentGenerationGate = "ready" | "stretch" | "blocked"

/** Components whose blocker status must override a positive average score. */
export const HARD_BLOCKER_COMPONENT_KEYS = [
  "sponsorshipLikelihood",
  "rightToWorkCompatibility",
  "relocationFit",
  "countryLocationFit"
] as const satisfies readonly FitComponentKey[]

/** Returns user-facing hard blockers without treating ordinary weak fit as an eligibility blocker. */
export function getHardBlockers(components: readonly FitComponent[]): string[] {
  return components
    .filter(
      (component) =>
        component.status === "blocker" &&
        HARD_BLOCKER_COMPONENT_KEYS.includes(
          component.key as (typeof HARD_BLOCKER_COMPONENT_KEYS)[number]
        )
    )
    .map((component) => `${component.label}: ${component.rationale}`)
}

/** Applies the legacy country-fit thresholds after hard blockers have been evaluated. */
export function getCountryFitDecision({
  overallScore,
  hasHardBlockers
}: {
  overallScore: number
  hasHardBlockers: boolean
}): CountryFitDecision {
  if (hasHardBlockers) {
    return "Skip for now"
  }

  if (overallScore >= 76) {
    return "Apply now"
  }

  if (overallScore >= 58) {
    return "Stretch application"
  }

  return "Improve profile first"
}

/** Maps a decision to the application-content safety gate. */
export function getContentGenerationGate(
  decision: CountryFitDecision
): ContentGenerationGate {
  if (decision === "Apply now") {
    return "ready"
  }

  if (decision === "Stretch application") {
    return "stretch"
  }

  return "blocked"
}

/** Confidence describes the clarity of the deterministic signals, not the probability of hiring. */
export function getComponentConfidence(
  components: readonly FitComponent[]
): "Low" | "Medium" | "High" {
  const blockers = components.filter(
    (component) => component.status === "blocker"
  ).length
  const strong = components.filter(
    (component) => component.status === "strong"
  ).length

  if (blockers > 0 || strong >= 3) {
    return "High"
  }

  return strong >= 1 ? "Medium" : "Low"
}

/** Converts a role-fit score into the application priority vocabulary shared by both apps. */
export function getApplicationPriority(
  score: number
): EUFitEngineResult["applicationPriority"] {
  if (score >= 80) {
    return "High Priority"
  }

  if (score >= 65) {
    return "Worth Applying"
  }

  if (score >= 50) {
    return "Stretch"
  }

  return "Skip"
}

