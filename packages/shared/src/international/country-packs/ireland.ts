// Ireland's CountryPack: employment-permit pathways, required evidence, and
// citations to the Department of Enterprise, Tourism and Employment sources
// they're based on. Consumed by assessInternationalJob (../assessment.ts)
// when the hiring country resolves to Ireland.
import type { CountryPack } from "../types.ts";

export const irelandCountryPack: CountryPack = {
  id: "ireland",
  displayName: "Ireland",
  supportLevel: "full",
  pathways: ["Critical Skills Employment Permit", "General Employment Permit"],
  occupationCategories: [
    "ICT",
    "engineering",
    "science",
    "finance",
    "business",
  ],
  requiredEvidence: [
    "Detailed duties and an occupation mapping",
    "Annual salary with currency",
    "Contract duration",
    "Employer and employing entity confirmation",
    "Current Irish permission, where relevant",
  ],
  recruiterQuestions: [
    "Which employing entity will issue the contract?",
    "Will the employer support the relevant employment-permit process?",
    "What are the annual base salary and contract duration?",
    "Which duties make up most of the role?",
  ],
  languageConsiderations: [
    "Check the vacancy for any explicit language requirement.",
  ],
  sources: [
    {
      publisher: "Department of Enterprise, Tourism and Employment",
      title: "Critical Skills Employment Permit",
      url: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/",
      jurisdiction: "Ireland",
      reviewedAt: "2026-07-29",
      ruleVersion: "ie-2026.07",
    },
    {
      publisher: "Department of Enterprise, Tourism and Employment",
      title: "Occupations Lists and Standard Occupational Classification",
      url: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/employment-permit-eligibility/classification-of-employments/",
      jurisdiction: "Ireland",
      reviewedAt: "2026-07-29",
      ruleVersion: "ie-2026.07",
    },
  ],
  limitations: [
    "AutoTime does not assign an occupation code from a job title alone.",
    "A potentially viable result is not an employment-permit decision.",
  ],
};
