// Germany's CountryPack: EU Blue Card / skilled-worker pathways, required
// evidence (including qualification recognition), and citations to the
// "Make it in Germany" federal government portal. Deliberately omits salary
// thresholds (see `limitations`) since those change and must be verified at
// the source rather than hard-coded here.
import type { CountryPack } from "../types.ts";

export const germanyCountryPack: CountryPack = {
  id: "germany",
  displayName: "Germany",
  supportLevel: "full",
  pathways: ["EU Blue Card", "Skilled-worker pathways"],
  occupationCategories: [
    "Technology",
    "engineering",
    "science",
    "regulated professions",
  ],
  requiredEvidence: [
    "Concrete job offer and contract evidence",
    "Salary with currency and pay period",
    "Qualification or relevant experience evidence",
    "Recognition evidence where required",
    "Language requirements from the vacancy",
  ],
  recruiterQuestions: [
    "Which German employing entity will issue the contract?",
    "Does the role require formal qualification recognition?",
    "What relocation and residence-permit support is available?",
    "Which working language is required day to day?",
  ],
  languageConsiderations: [
    "Detect German-language requirements from the vacancy; do not assume English-only operation.",
  ],
  sources: [
    {
      publisher: "Make it in Germany — Federal Government portal",
      title: "EU Blue Card",
      url: "https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card",
      jurisdiction: "Germany",
      reviewedAt: "2026-07-29",
      ruleVersion: "de-2026.07",
    },
    {
      publisher: "Make it in Germany — Federal Government portal",
      title: "Recognition in Germany",
      url: "https://www.make-it-in-germany.com/en/working-in-germany/recognition",
      jurisdiction: "Germany",
      reviewedAt: "2026-07-29",
      ruleVersion: "de-2026.07",
    },
  ],
  limitations: [
    "Salary thresholds are deliberately not embedded and must be checked at the official source.",
    "Qualification recognition depends on the profession and applicant evidence.",
  ],
};
