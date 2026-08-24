// Guards the handoff between a raw CandidateProfile and any downstream
// feature (fit scoring, content generation, international assessment) that
// needs a minimum-viable profile to produce trustworthy output. Kept
// separate from fit-model.ts so both apps can cheaply check "is this profile
// even usable yet" (e.g. to gate a CTA) without running the full scoring engine.
import type { CandidateProfile } from "./types.ts"

/** The CandidateProfile fields treated as mandatory before fit scoring/content generation can be trusted, with human-readable labels for UI messaging. */
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

/** Returns the human-readable labels of every mandatory profile field that is missing or blank (empty/whitespace-only string). An empty array means the profile is complete enough to proceed. */
export function getCandidateProfileBridgeIssues(profile: CandidateProfile) {
  return mandatoryCandidateProfileBridgeFields
    .filter(({ field }) => {
      const value = profile[field]
      return typeof value !== "string" || value.trim().length === 0
    })
    .map(({ label }) => label)
}

/** True when every mandatory profile field is populated - the gate check UI/routes use before allowing fit scoring or content generation. */
export function hasCandidateProfileBridgeEvidence(profile: CandidateProfile) {
  return getCandidateProfileBridgeIssues(profile).length === 0
}
