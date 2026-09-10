import type { OccupationModule } from "./module-contract.ts";

export const techFintechOccupationModule = {
  id: "tech-fintech",
  version: "1.0.0",
  label: "Technology and FinTech",
  riskLevel: "low",
  supportedRoles: [
    "Software engineering",
    "Data and analytics",
    "Cybersecurity",
    "Cloud, infrastructure and DevOps",
    "QA and test engineering",
    "Technical product management",
    "Business and systems analysis",
    "Technology consulting and implementation",
    "FinTech operations and risk technology",
  ],
  exclusions: [
    "Roles requiring a professional licence not represented by this module",
    "Legal or immigration advice",
  ],
  applicableCountries: ["European Union", "United Kingdom"],
  requiredEvidence: [
    "employment history",
    "relevant skills",
    "work-right context",
    "target role",
  ],
  optionalEvidence: ["projects", "portfolio", "certifications", "outcomes"],
  mandatoryRequirements: ["explicit vacancy eligibility requirements"],
  preferredRequirements: ["skills", "domain exposure", "delivery outcomes"],
  protectedTerms: [],
  uncertaintyPolicy:
    "Unknown or conflicting material eligibility evidence must produce Investigate first or Insufficient evidence, never an inferred Apply decision.",
  outputConventions: [
    "Use only supported candidate claims",
    "Separate mandatory blockers from preferred gaps",
    "Require human review before export or submission",
  ],
  accessibilityRequirements: [
    "Plain-language decision explanation",
    "Keyboard-operable review flow",
    "Status is not communicated by colour alone",
  ],
  sources: [],
  owner: "Product and Engineering",
  testPackId: "tech-fintech-core-v1",
} satisfies OccupationModule;
