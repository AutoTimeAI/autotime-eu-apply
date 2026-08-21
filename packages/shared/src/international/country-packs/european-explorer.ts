import type { CountryPack } from "../types.ts";

export const europeanExplorerPack: CountryPack = {
  id: "european-explorer",
  displayName: "Other Europe",
  supportLevel: "explorer",
  pathways: [],
  occupationCategories: [],
  requiredEvidence: [
    "Hiring country",
    "Language requirements",
    "Salary information",
    "Sponsorship or relocation wording",
    "Location practicality",
  ],
  recruiterQuestions: [
    "Which legal entity and country will employ me?",
    "Does this vacancy support applicants who need work permission?",
    "Which working languages and office-attendance pattern are required?",
  ],
  languageConsiderations: [
    "Use vacancy wording only and verify local requirements.",
  ],
  sources: [
    {
      publisher: "EURES — European Employment Services",
      title: "Living and working in Europe",
      url: "https://eures.europa.eu/living-and-working_en",
      jurisdiction: "European Union",
      reviewedAt: "2026-07-29",
      ruleVersion: "eu-explorer-2026.07",
    },
  ],
  limitations: [
    "Explorer mode does not calculate permit eligibility or pathway viability.",
    "Limited coverage — verification required.",
  ],
};
