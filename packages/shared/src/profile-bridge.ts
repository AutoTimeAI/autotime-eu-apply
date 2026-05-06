import type { CandidateProfile } from "./types.ts"

export const mandatoryCandidateProfileBridgeFields: Array<{
  field: keyof CandidateProfile
  label: string
}> = [
  { field: "fullName", label: "full name" },
  { field: "currentCountry", label: "current country" },
  { field: "targetCountries", label: "target countries" },
  { field: "targetRoles", label: "target roles" },
  { field: "workRightDetails", label: "work-right details" },
  { field: "baseCvText", label: "CV evidence" }
]

export function getCandidateProfileBridgeIssues(profile: CandidateProfile) {
  return mandatoryCandidateProfileBridgeFields
    .filter(({ field }) => {
      const value = profile[field]
      return typeof value !== "string" || value.trim().length === 0
    })
    .map(({ label }) => label)
}

export function hasCandidateProfileBridgeEvidence(profile: CandidateProfile) {
  return getCandidateProfileBridgeIssues(profile).length === 0
}
