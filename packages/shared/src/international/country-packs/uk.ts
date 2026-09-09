// The UK's CountryPack: Skilled Worker visa pathway, required evidence, and
// citations to GOV.UK sources they're based on. Consumed by
// assessInternationalJob (../assessment.ts) when the hiring country
// resolves to "United Kingdom" - added later than Ireland/Germany/
// Netherlands, once Stamp4's sponsorship-engine reconciliation surfaced
// that this module had no dedicated UK coverage yet even though the
// legacy country-rules.ts (fit-model.ts's now-deprecated companion) did.
import type { CountryPack } from "../types.ts";

export const ukCountryPack: CountryPack = {
  id: "uk",
  displayName: "United Kingdom",
  supportLevel: "full",
  pathways: ["Skilled Worker visa"],
  occupationCategories: ["ICT", "engineering", "science", "finance", "business"],
  requiredEvidence: [
    "Detailed duties and an SOC 2020 occupation-code mapping",
    "Annual salary with currency",
    "Contract duration",
    "Employer holds a Home Office sponsor licence for the Skilled Worker route",
  ],
  recruiterQuestions: [
    "Will the company assign a Certificate of Sponsorship under the Skilled Worker route for this exact role?",
    "What SOC 2020 code and going rate does the role map to, and does the salary clear it?",
    "What are the annual base salary and contract duration?",
  ],
  languageConsiderations: [
    "Check the vacancy for any explicit language requirement.",
  ],
  sources: [
    {
      publisher: "Home Office / UK Visas and Immigration",
      title: "Skilled Worker visa",
      url: "https://www.gov.uk/skilled-worker-visa",
      jurisdiction: "United Kingdom",
      reviewedAt: "2026-09-09",
      ruleVersion: "uk-2026.09",
    },
    {
      publisher: "Home Office",
      title: "Register of licensed sponsors: workers",
      url: "https://www.gov.uk/government/publications/register-of-licensed-sponsors-workers",
      jurisdiction: "United Kingdom",
      reviewedAt: "2026-09-09",
      ruleVersion: "uk-2026.09",
    },
  ],
  limitations: [
    "AutoTime does not assign an SOC 2020 code from a job title alone.",
    "A potentially viable result is not a Certificate of Sponsorship or visa decision.",
  ],
};
