// Zod schemas and TS types for the "International" module: the successor to
// the legacy CountryRule-based fit logic (../country-rules.ts,
// ../fit-model.ts). Models a candidate's cross-border mobility situation
// (MobilityProfile), the evidence submitted for one job assessment
// (InternationalAssessmentInput), a country's supported immigration pathways
// (CountryPack, defined per-country in ./country-packs/*), and the resulting
// InternationalAssessment. Everything here is evidence-first by design: an
// assessment can only report what was actually supplied/confirmed, never
// assert a visa/permit outcome (see assessment.ts's `cannotConfirm` field).
import { z } from "zod";

/** How the applicant is positioned relative to a hiring country's work-authorisation requirements. */
export const applicantPositionSchema = z.enum([
  "international-applicant",
  "local-work-authorised",
  "eu-eea-swiss-citizen",
  "existing-country-permission",
  "sponsorship-required",
  "unsure",
]);

/** How strong the evidence is for a country/pathway assessment - from a confirmed blocker down to no supporting evidence at all. */
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

/** A citation to a specific official (government/EU) source backing a country pack's guidance, versioned so stale rule references can be detected. */
export const officialSourceCitationSchema = z.object({
  publisher: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  jurisdiction: z.string().min(1),
  reviewedAt: z.string().date(),
  ruleVersion: z.string().min(1),
});

/**
 * The candidate's own cross-border mobility situation: current/target
 * countries, work-authorisation position, sponsorship need, relocation
 * preference, and salary expectations. This is the "current profile"
 * counterpart to InternationalAssessmentInput's per-job evidence, and is
 * what migration.ts derives from the legacy CandidateProfile.
 */
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

/** Evidence about whether a specific employer/entity supports sponsorship in a given country - e.g. from an official sponsor register or the vacancy text itself - with the confidence level of that source. */
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

/** All the per-job evidence assessInternationalJob (./assessment.ts) needs to produce an InternationalAssessment: hiring country, mobility profile, job text/duties, salary, and any employer-specific sponsorship evidence. */
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
/** "full" = a dedicated pack with confirmed pathways and cited sources (see country-packs/ireland.ts etc.); "explorer" = the generic fallback pack for countries without dedicated coverage yet (country-packs/european-explorer.ts). */
export type CountrySupportLevel = "full" | "explorer";
/** A single country's immigration-pathway knowledge: supported routes, what evidence is required to assess them, recruiter questions to ask, and the official sources backing all of it. One instance per supported country, defined in ./country-packs/*.ts. */
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
/**
 * The output of assessing one job against a candidate's mobility situation:
 * a decision plus the evidence trail behind it (what was used, what's
 * missing, and any confirmed blockers), the official sources it draws on,
 * and `cannotConfirm` - an explicit list of claims this assessment
 * deliberately does not and cannot make (e.g. whether a visa will actually
 * be granted), to keep the guidance honest about its limits.
 */
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
