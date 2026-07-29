import type { CountryPack } from "../types.ts";

export const netherlandsCountryPack: CountryPack = {
  id: "netherlands",
  displayName: "Netherlands",
  supportLevel: "full",
  pathways: ["Highly Skilled Migrant", "European Blue Card"],
  occupationCategories: [
    "Technology",
    "engineering",
    "science",
    "highly skilled work",
  ],
  requiredEvidence: [
    "Dutch employing entity",
    "Recognised-sponsor evidence for the Highly Skilled Migrant route",
    "Gross monthly salary with currency",
    "Applicable age-band evidence",
    "Employment contract",
    "Hybrid location and relocation constraints",
  ],
  recruiterQuestions: [
    "Which Dutch legal entity will employ me?",
    "Is that entity currently an IND-recognised sponsor?",
    "Does this vacancy itself include sponsorship support?",
    "What is the gross monthly salary excluding holiday allowance?",
  ],
  languageConsiderations: [
    "Check the vacancy for Dutch or other language requirements.",
  ],
  sources: [
    {
      publisher: "Immigration and Naturalisation Service (IND)",
      title: "Highly skilled migrant",
      url: "https://ind.nl/en/residence-permits/work/highly-skilled-migrant",
      jurisdiction: "Netherlands",
      reviewedAt: "2026-07-29",
      ruleVersion: "nl-2026.07",
    },
    {
      publisher: "Immigration and Naturalisation Service (IND)",
      title: "Public register recognised sponsors",
      url: "https://ind.nl/en/public-register-recognised-sponsors",
      jurisdiction: "Netherlands",
      reviewedAt: "2026-07-29",
      ruleVersion: "nl-2026.07",
    },
  ],
  limitations: [
    "Register presence does not prove that a particular vacancy will be sponsored.",
    "Income requirements vary; verify the current age-band and situation at IND.",
  ],
};
