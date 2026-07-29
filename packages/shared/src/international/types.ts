import { z } from "zod";

export const applicantPositionSchema = z.enum([
  "international-applicant",
  "local-work-authorised",
  "eu-eea-swiss-citizen",
  "existing-country-permission",
  "sponsorship-required",
  "unsure",
]);

export const pathwayEvidenceStatusSchema = z.enum([
  "confirmed-blocker",
  "potentially-viable",
  "verification-required",
  "insufficient-evidence",
  "not-supported",
]);

export const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  period: z.enum(["hour", "month", "year"]),
});

export const officialSourceCitationSchema = z.object({
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  jurisdiction: z.string().min(1),
  reviewedAt: z.string().date(),
  ruleVersion: z.string().min(1),
});

export const mobilityProfileSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  currentCountry: z.string(),
  targetCountries: z.array(z.string()).default([]),
  applicantPosition: applicantPositionSchema,
  currentPermissionType: z.string().optional(),
  permissionExpiryDate: z.string().date().optional(),
  sponsorshipRequired: z.enum(["yes", "no", "unsure"]),
  relocationPreference: z.enum(["yes", "no", "depends"]),
  earliestStartDate: z.string().date().optional(),
  noticePeriod: z.string().optional(),
  minimumSalary: moneySchema.optional(),
  preferredSalary: moneySchema.optional(),
  relocationConstraints: z.string().optional(),
  notes: z.string().optional(),
  lastVerifiedAt: z.string().datetime().optional(),
});

export const employerSponsorshipEvidenceSchema = z.object({
  employerName: z.string().min(1),
  employingEntity: z.string().optional(),
  country: z.string().min(1),
  sourceType: z.enum([
    "official-register",
    "vacancy-statement",
    "recruiter-confirmation",
    "unverified",
  ]),
  evidenceText: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  checkedAt: z.string().datetime().optional(),
  status: z.enum([
    "confirmed",
    "positive-signal",
    "negative-signal",
    "unknown",
  ]),
});

export const internationalAssessmentInputSchema = z.object({
  country: z.string().min(1),
  mobilityProfile: mobilityProfileSchema,
  jobText: z.string().default(""),
  roleDuties: z.string().default(""),
  salary: moneySchema.optional(),
  contractDurationMonths: z.number().int().positive().optional(),
  qualificationEvidence: z.enum(["confirmed", "missing", "unsure"]).optional(),
  occupationMapping: z
    .enum(["confirmed", "uncertain", "not-checked"])
    .optional(),
  employerEvidence: employerSponsorshipEvidenceSchema.optional(),
});

export type ApplicantPosition = z.infer<typeof applicantPositionSchema>;
export type PathwayEvidenceStatus = z.infer<typeof pathwayEvidenceStatusSchema>;
export type Money = z.infer<typeof moneySchema>;
export type OfficialSourceCitation = z.infer<
  typeof officialSourceCitationSchema
>;
export type MobilityProfile = z.infer<typeof mobilityProfileSchema>;
export type EmployerSponsorshipEvidence = z.infer<
  typeof employerSponsorshipEvidenceSchema
>;
export type InternationalAssessmentInput = z.infer<
  typeof internationalAssessmentInputSchema
>;
export type CountrySupportLevel = "full" | "explorer";
export type CountryPack = {
  id: string;
  displayName: string;
  supportLevel: CountrySupportLevel;
  pathways: string[];
  occupationCategories: string[];
  requiredEvidence: string[];
  recruiterQuestions: string[];
  languageConsiderations: string[];
  sources: OfficialSourceCitation[];
  limitations: string[];
};
export type InternationalDecision =
  | "Apply"
  | "Investigate first"
  | "Stretch application"
  | "Skip"
  | "Insufficient evidence";
export type InternationalAssessment = {
  country: string;
  supportLevel: CountrySupportLevel;
  pathwayStatus: PathwayEvidenceStatus;
  decision: InternationalDecision;
  evidenceUsed: string[];
  missingEvidence: string[];
  confirmedBlockers: string[];
  assumptions: string[];
  nextAction: string;
  sources: OfficialSourceCitation[];
  cannotConfirm: string[];
};
