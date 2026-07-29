import {
  europeanExplorerPack,
  germanyCountryPack,
  irelandCountryPack,
  netherlandsCountryPack,
} from "./country-packs/index.ts";
import {
  internationalAssessmentInputSchema,
  type CountryPack,
  type InternationalAssessment,
  type InternationalAssessmentInput,
} from "./types.ts";

const fullCountryPacks = [
  irelandCountryPack,
  germanyCountryPack,
  netherlandsCountryPack,
];
export const supportedExplorerCountries = [
  "Belgium",
  "Luxembourg",
  "France",
  "Spain",
  "Portugal",
  "Sweden",
  "Denmark",
  "Finland",
  "Austria",
  "Poland",
  "Czechia",
  "Estonia",
  "Lithuania",
];

export function getInternationalCountryPack(country: string): CountryPack {
  const normalized = country.trim().toLowerCase();
  return (
    fullCountryPacks.find(
      (pack) =>
        pack.id === normalized || pack.displayName.toLowerCase() === normalized,
    ) ?? europeanExplorerPack
  );
}

function includesAny(text: string, signals: string[]) {
  const normalized = text.toLowerCase();
  return signals.some((signal) => normalized.includes(signal));
}

export function assessInternationalJob(
  value: InternationalAssessmentInput,
): InternationalAssessment {
  const input = internationalAssessmentInputSchema.parse(value);
  const pack = getInternationalCountryPack(input.country);
  const jobText = `${input.jobText} ${input.roleDuties}`.trim();
  const needsSponsorship =
    input.mobilityProfile.sponsorshipRequired === "yes" ||
    input.mobilityProfile.applicantPosition === "sponsorship-required";
  const rejectsSponsorship = includesAny(jobText, [
    "no sponsorship",
    "unable to sponsor",
    "cannot sponsor",
    "must have existing right to work",
    "eu work rights required",
  ]);
  const supportsSponsorship = includesAny(jobText, [
    "visa sponsorship",
    "permit sponsorship",
    "sponsorship available",
    "relocation support",
  ]);
  const evidenceUsed: string[] = [];
  const missingEvidence: string[] = [];
  const confirmedBlockers: string[] = [];
  const assumptions: string[] = [];

  if (pack.supportLevel === "explorer") {
    if (jobText)
      evidenceUsed.push("Vacancy wording supplied for general fit signals");
    if (input.salary)
      evidenceUsed.push("Salary includes currency and pay period");
    return {
      country: input.country,
      supportLevel: "explorer",
      pathwayStatus: "not-supported",
      decision: "Investigate first",
      evidenceUsed,
      missingEvidence: [
        !jobText && "Vacancy wording",
        !input.salary && "Salary evidence",
        "Country-specific official pathway verification",
      ].filter(Boolean) as string[],
      confirmedBlockers: [],
      assumptions: ["The selected hiring country is correct."],
      nextAction:
        "Use EURES and the relevant national-government source to verify the country-specific position.",
      sources: pack.sources,
      cannotConfirm: [
        "Any permit pathway, threshold, or eligibility conclusion in explorer mode.",
      ],
    };
  }

  if (rejectsSponsorship && needsSponsorship)
    confirmedBlockers.push(
      "The vacancy states that sponsorship or new work permission is not available.",
    );
  else if (supportsSponsorship)
    evidenceUsed.push(
      "Positive sponsorship or relocation wording appears in the vacancy.",
    );
  else if (needsSponsorship)
    missingEvidence.push("Vacancy-level sponsorship confirmation");
  if (input.salary)
    evidenceUsed.push("Salary includes amount, currency and pay period.");
  else missingEvidence.push("Salary with currency and pay period");
  if (!input.contractDurationMonths) missingEvidence.push("Contract duration");
  else evidenceUsed.push("Contract duration supplied by the user or vacancy.");
  if (input.occupationMapping !== "confirmed")
    missingEvidence.push("Occupation mapping from the role's actual duties");
  else evidenceUsed.push("User-confirmed occupation/duties mapping.");
  if (pack.id === "germany" && input.qualificationEvidence !== "confirmed")
    missingEvidence.push("Qualification or recognition evidence");
  if (pack.id === "netherlands") {
    if (
      input.employerEvidence?.sourceType === "official-register" &&
      input.employerEvidence.status === "confirmed"
    ) {
      evidenceUsed.push("Employer appears on an official sponsor register.");
      assumptions.push(
        "Register presence does not prove sponsorship for this vacancy.",
      );
    } else
      missingEvidence.push(
        "Recognised-sponsor status for the Dutch employing entity",
      );
  }
  if (input.employerEvidence?.status === "negative-signal" && needsSponsorship)
    confirmedBlockers.push(
      "Employer evidence contains a negative sponsorship signal.",
    );

  const pathwayStatus = confirmedBlockers.length
    ? "confirmed-blocker"
    : missingEvidence.length
      ? "verification-required"
      : "potentially-viable";
  return {
    country: pack.displayName,
    supportLevel: "full",
    pathwayStatus,
    decision: confirmedBlockers.length
      ? "Skip"
      : missingEvidence.length
        ? "Investigate first"
        : "Apply",
    evidenceUsed,
    missingEvidence,
    confirmedBlockers,
    assumptions,
    nextAction: confirmedBlockers.length
      ? "Confirm the vacancy wording with the employer before investing more application time."
      : missingEvidence.length
        ? `Verify ${missingEvidence[0].toLowerCase()} next.`
        : "Proceed with the application while retaining the cited evidence.",
    sources: pack.sources,
    cannotConfirm: [
      "Whether a government authority will grant a visa or permit.",
      "Whether an employer will sponsor this particular vacancy.",
    ],
  };
}
