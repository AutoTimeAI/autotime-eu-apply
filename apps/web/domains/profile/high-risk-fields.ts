import type { CandidateProfile } from "shared"

/**
 * The strategy's acceptance gate is "edits to identity, employment dates,
 * qualifications, work rights and quantified achievements receive
 * high-risk treatment" (docs/product-core-investment-strategy.md, evidence
 * integrity pillar). This profile schema has no discrete fields for
 * "employment dates" or "quantified achievements" - that information lives
 * as free text inside baseCvText/experienceHighlights/projectSummaries -
 * so those three prose fields are classified high-risk alongside the
 * identity and work-right fields that do map directly.
 */
const HIGH_RISK_PROFILE_FIELDS = new Set<keyof CandidateProfile>([
  "fullName",
  "workRightDetails",
  "sponsorshipNeeded",
  "baseCvText",
  "experienceHighlights",
  "projectSummaries"
])

export function isHighRiskProfileField(field: keyof CandidateProfile): boolean {
  return HIGH_RISK_PROFILE_FIELDS.has(field)
}

export function getHighRiskProfileFieldReason(
  field: keyof CandidateProfile
): string {
  switch (field) {
    case "fullName":
      return "Identity claims are used directly in generated applications - verify this matches your official documents."
    case "workRightDetails":
    case "sponsorshipNeeded":
      return "Work-right and sponsorship claims are never authorised by AutoTime - only add facts you can verify yourself."
    case "baseCvText":
    case "experienceHighlights":
    case "projectSummaries":
      return "Dates, qualifications and quantified achievements here are copied into generated applications - keep them factual and current."
    default:
      return "This field is treated as high-risk and reviewed with extra care before use in applications."
  }
}
