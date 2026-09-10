// The core International assessment engine: turns a candidate's mobility
// profile plus one job's evidence into a country-aware Apply/Investigate/
// Skip decision (assessInternationalJob), routed through whichever
// CountryPack matches the hiring country. Deliberately rule-based rather
// than AI-driven, since this evidence has legal/financial consequences for
// the candidate; every conclusion must trace back to a specific evidence
// field or an explicit "missing evidence" gap rather than an inference.
import {
  europeanExplorerPack,
  germanyCountryPack,
  irelandCountryPack,
  netherlandsCountryPack,
  ukCountryPack,
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
  ukCountryPack,
];
/** Countries with generic "explorer" coverage (see country-packs/european-explorer.ts) rather than a dedicated pack - listed for UI display, not used to gate assessInternationalJob's own pack lookup. */
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

/** Looks up the CountryPack for a country by id or display name (case-insensitive). Falls back to europeanExplorerPack for any country without dedicated coverage, so this never returns undefined. */
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

const sponsorshipRejectionSignals = [
  "no sponsorship",
  "unable to sponsor",
  "cannot sponsor",
  "cannot provide sponsorship",
  "cannot provide visa sponsorship",
  "must have right to work",
  "must have existing right to work",
  "existing right to work",
  "without sponsorship",
  "eu work rights required",
]

// A plain substring list cannot catch real vacancy phrasing like "No visa
// sponsorship is available" or "We are unable to provide visa sponsorship"
// - the denial word and "sponsorship" are real words apart, not adjacent.
// This regex is deliberately more permissive than the literal signals list
// above (matches "cannot/unable to/no", optionally "offer"/"provide",
// optionally "visa", then "sponsorship" in any of those combinations) and
// catches every case the literal list also catches, plus the ones it
// doesn't - so it's additive, not a replacement for the list's other
// non-sponsorship-worded entries (e.g. "existing right to work").
const sponsorshipDenialPattern =
  /(?:cannot|unable to|no)\s+(?:offer|provide)?\s*(?:visa\s+)?sponsorship/i

/** Canonical vacancy-language policy shared by every live decision path. */
export function vacancyRejectsSponsorship(
  jobText: string,
  additionalSignals: string[] = [],
): boolean {
  return (
    sponsorshipDenialPattern.test(jobText) ||
    includesAny(jobText, [...sponsorshipRejectionSignals, ...additionalSignals])
  )
}

/**
 * Resolves the jurisdiction used for a vacancy assessment. An explicit
 * caller choice wins; otherwise the vacancy's own country outranks the
 * candidate's general target-country list. This prevents a saved preference
 * for one country from silently governing a role located in another.
 */
export function resolveAssessmentCountry({
  explicitCountry,
  vacancyCountry,
  profileTargetCountries = [],
}: {
  explicitCountry?: string | null
  vacancyCountry?: string | null
  profileTargetCountries?: string[]
}): string | null {
  return (
    explicitCountry?.trim() ||
    vacancyCountry?.trim() ||
    profileTargetCountries.map((country) => country.trim()).find(Boolean) ||
    null
  )
}

/**
 * Assesses one job's cross-border viability for a candidate, routed by the
 * hiring country's CountryPack. In "explorer" mode (no dedicated pack) it
 * always returns "Investigate first" with no pathway conclusions - the pack
 * has nothing evidence-checkable to reason over. In "full" mode it checks
 * sponsorship signals in the job text against the candidate's need, then
 * requires salary, contract duration, and occupation-mapping evidence before
 * it will call the pathway "potentially viable"; missing any of these
 * degrades the decision to "Investigate first" rather than guessing. Country
 * packs can add their own required checks (e.g. Germany's qualification
 * evidence, Netherlands' recognised-sponsor register). Throws if `value`
 * fails internationalAssessmentInputSchema validation.
 */
export function assessInternationalJob(
  value: InternationalAssessmentInput,
): InternationalAssessment {
  const input = internationalAssessmentInputSchema.parse(value);
  const pack = getInternationalCountryPack(input.country);
  const jobText = `${input.jobText} ${input.roleDuties}`.trim();
  const needsSponsorship =
    input.mobilityProfile.sponsorshipRequired === "yes" ||
    input.mobilityProfile.applicantPosition === "sponsorship-required";
  const rejectsSponsorship = vacancyRejectsSponsorship(jobText);
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
  // Additive to the two fixed disclosures every "full"-support result
  // already carries (below) - never replaces them.
  const additionalCannotConfirm: string[] = [];

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
      stamp4Verified: false,
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

  // Stamp4's real statutory-threshold check (UK/Ireland/Netherlands/Germany
  // only - input.stamp4Assessment is absent everywhere else, including
  // every explorer-mode country) is a distinct, higher-confidence evidence
  // source: a blocker there (e.g. salary below the real threshold) carries
  // at least as much weight as the text-signal/manual-flag blockers checked
  // above, and a clean pass satisfies the salary/occupation-mapping
  // evidence below without requiring the user to separately confirm them
  // by hand - reconciling AutoTime's broader text-signal engine with
  // Stamp4's narrower, precise legal check rather than one overriding the
  // other (see docs on the sponsorship-engine reconciliation design).
  const stamp4 = input.stamp4Assessment;
  let stamp4SatisfiesSalary = false;
  let stamp4SatisfiesOccupation = false;
  if (stamp4) {
    if (stamp4.blockers.length > 0) {
      confirmedBlockers.push(
        ...stamp4.blockers.map(
          (reason) => `Stamp4 legal-eligibility check: ${reason}`,
        ),
      );
    } else {
      if (
        stamp4.salaryDetectedEUR !== null &&
        stamp4.salaryThresholdEUR !== null
      ) {
        evidenceUsed.push(
          `Stamp4 verified: detected salary ~€${stamp4.salaryDetectedEUR.toLocaleString()} clears the €${stamp4.salaryThresholdEUR.toLocaleString()} statutory threshold for ${stamp4.pathway}.`,
        );
        stamp4SatisfiesSalary = true;
      }
      if (stamp4.occupationConfidence !== "Low") {
        evidenceUsed.push(
          `Stamp4 verified: role maps to ${stamp4.occupationCode} (${stamp4.occupationConfidence.toLowerCase()} confidence).`,
        );
        stamp4SatisfiesOccupation = true;
      }
    }
  }

  if (input.salary) {
    evidenceUsed.push("Salary includes amount, currency and pay period.");
    // Presence of a well-formed salary figure is not the same as that
    // figure clearing the country's actual current legal minimum for this
    // pathway - country packs deliberately don't embed threshold numbers
    // (see e.g. germany.ts's own limitations entry, since they change and
    // must be verified at the source), and without Stamp4's real
    // statutory-threshold check this function has no way to compare the
    // candidate's stated salary against one. Silently treating "salary
    // supplied" as positive evidence without disclosing that the actual
    // number was never checked is exactly the overconfidence this
    // engine's own design otherwise avoids - so make the gap explicit
    // rather than implicit.
    if (!stamp4SatisfiesSalary)
      additionalCannotConfirm.push(
        "Whether the stated salary clears the current published minimum for this pathway - verify the exact figure at the official source before relying on this result.",
      );
  } else if (!stamp4SatisfiesSalary)
    missingEvidence.push("Salary with currency and pay period");
  if (!input.contractDurationMonths) missingEvidence.push("Contract duration");
  else evidenceUsed.push("Contract duration supplied by the user or vacancy.");
  if (input.occupationMapping === "confirmed")
    evidenceUsed.push("User-confirmed occupation/duties mapping.");
  else if (!stamp4SatisfiesOccupation)
    missingEvidence.push("Occupation mapping from the role's actual duties");
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
  if (pack.id === "uk") {
    if (
      input.employerEvidence?.sourceType === "official-register" &&
      input.employerEvidence.status === "confirmed"
    ) {
      evidenceUsed.push(
        "Employer appears on the Home Office Register of Licensed Sponsors (Skilled Worker route).",
      );
      assumptions.push(
        "Register presence does not guarantee a Certificate of Sponsorship for this vacancy.",
      );
    } else
      missingEvidence.push(
        "Home Office sponsor-licence confirmation for the Skilled Worker route",
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
      ...additionalCannotConfirm,
    ],
    stamp4Verified: Boolean(stamp4),
  };
}
