import type { Stamp4SponsorshipAssessment } from "./types.ts";

/**
 * Version of the rules imported from the former Stamp4 sponsorship service.
 * Bump this whenever a threshold, pathway, occupation mapping, or signal rule
 * changes so stored assessment snapshots remain explainable and replayable.
 */
export const SPONSORSHIP_RULESET_VERSION = "stamp4-import-2026.09.15";
export const SPONSORSHIP_RULESET_EFFECTIVE_AT = "2026-01-01";

type ThresholdRule = {
  claimId: string;
  pathway: string;
  annualThresholdEur: number;
  sourceUrl: string;
  sourceReviewedAt: string;
  sourceValue: number;
  sourceCurrency: string;
  sourcePeriod: "month" | "year";
  transformation?: string;
};

const thresholdRules = {
  uk: {
    claimId: "uk-skilled-worker-general-salary-2026",
    pathway: "UK Skilled Worker visa",
    annualThresholdEur: Math.round(41_700 * 1.17),
    sourceUrl: "https://www.gov.uk/skilled-worker-visa/your-job",
    sourceReviewedAt: "2026-09-15",
    sourceValue: 41_700,
    sourceCurrency: "GBP",
    sourcePeriod: "year",
    transformation: "Converted to EUR at the ruleset's fixed GBP/EUR rate of 1.17; this is an AutoTime comparison assumption, not a government exchange rate.",
  },
  ireland: {
    claimId: "ie-csep-relevant-degree-salary-2026",
    pathway: "Ireland Critical Skills Employment Permit",
    annualThresholdEur: 40_904,
    sourceUrl: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/",
    sourceReviewedAt: "2026-09-15",
    sourceValue: 40_904,
    sourceCurrency: "EUR",
    sourcePeriod: "year",
  },
  irelandHighSalary: {
    claimId: "ie-csep-high-salary-2026",
    pathway: "Critical Skills high-salary route or General Employment Permit",
    annualThresholdEur: 68_911,
    sourceUrl: "https://enterprise.gov.ie/en/what-we-do/workplace-and-skills/employment-permits/permit-types/critical-skills-employment-permit/",
    sourceReviewedAt: "2026-09-15",
    sourceValue: 68_911,
    sourceCurrency: "EUR",
    sourcePeriod: "year",
  },
  netherlands: {
    claimId: "nl-hsm-age-30-plus-income-2026",
    pathway: "Netherlands Highly Skilled Migrant – age band must be confirmed",
    annualThresholdEur: 5_942 * 12,
    sourceUrl: "https://ind.nl/en/required-amounts-income-requirements",
    sourceReviewedAt: "2026-09-15",
    sourceValue: 5_942,
    sourceCurrency: "EUR",
    sourcePeriod: "month",
    transformation: "Annualized by multiplying the official monthly gross SV-wage, excluding holiday allowance, by 12.",
  },
  germany: {
    claimId: "de-eu-blue-card-general-salary-2026",
    pathway: "Germany EU Blue Card",
    annualThresholdEur: 50_700,
    sourceUrl: "https://www.make-it-in-germany.com/en/visa-residence/types/eu-blue-card",
    sourceReviewedAt: "2026-09-15",
    sourceValue: 50_700,
    sourceCurrency: "EUR",
    sourcePeriod: "year",
  },
} as const satisfies Record<string, ThresholdRule>;

const negativeSignals = [
  "no sponsorship",
  "unable to sponsor",
  "must have right to work",
  "authorised to work",
  "authorized to work",
  "without sponsorship",
];

const positiveSignals = [
  "visa sponsorship",
  "work permit",
  "relocation support",
  "immigration support",
  "sponsor licence",
  "recognized sponsor",
  "recognised sponsor",
];

export type SponsorshipReadinessInput = {
  roleTitle: string;
  country: string;
  salary?: string | null;
  rawText?: string;
  domainKeywords?: string[];
  requiredSkills?: string[];
  responsibilities?: string[];
  mobility?: {
    sponsorshipRequirement?: string;
    earliestStartDate?: string;
    noticePeriod?: string;
  };
};

function detectAnnualSalaryEur(
  value: string | null | undefined,
  defaultCurrency: "EUR" | "GBP" = "EUR",
): number | null {
  if (!value) return null;
  const values = Array.from(value.matchAll(/(?:(€|eur|£|gbp)\s*)?(\d{4,6}|\d{1,3}(?:[,\s]\d{3})|\d{2,3})\s*(k)?\s*(€|eur|£|gbp)?/gi)).map(
    (match) => {
      const numeric = Number(match[2].replace(/[,\s]/g, ""));
      const amount = match[3] ? numeric * 1000 : numeric;
      const currency = (match[1] || match[4] || defaultCurrency).toUpperCase();
      const annual = /\b(?:per\s+month|monthly|\/\s*month|p\.m\.)\b/i.test(value)
        ? amount * 12
        : amount;
      return currency === "£" || currency === "GBP" ? Math.round(annual * 1.17) : annual;
    },
  ).filter((amount) => amount >= 10_000 && amount <= 500_000);
  if (!values.length) return null;
  return Math.min(...values);
}

function salaryEvidenceFromVacancy(rawText: string | undefined): string | null {
  if (!rawText) return null;
  const labelled = rawText.match(/(?:salary|compensation|base pay|pay range|remuneration)[^\n.;]{0,100}/i)?.[0];
  if (labelled) return labelled;
  const currencyAmount = rawText.match(/(?:€|eur|£|gbp)\s*\d{2,6}(?:[,\s]\d{3})?\s*k?|\d{2,6}(?:[,\s]\d{3})?\s*k?\s*(?:€|eur|£|gbp)/i)?.[0];
  return currencyAmount ?? null;
}

function occupationLane(title: string) {
  const normalized = title.toLowerCase();
  if (/business systems analyst|it business analyst|systems analyst|application analyst|financial systems analyst/.test(normalized)) {
    return { code: "SOC 2135", confidence: "High" as const };
  }
  if (/business analyst|technical analyst|data analyst|application support/.test(normalized)) {
    return { code: "Likely SOC 2135 – duties must confirm", confidence: "Medium" as const };
  }
  return { code: "Occupation mapping required", confidence: "Low" as const };
}

/**
 * Local successor to Stamp4's stateless sponsorship-check endpoint. It keeps
 * the original decision contract while removing a production dependency on
 * the retired standalone deployment. Results are decision support, not legal
 * advice; current official-source governance remains the publication gate.
 */
export function assessSponsorshipReadiness(
  input: SponsorshipReadinessInput,
  checkedAt = new Date().toISOString(),
): Stamp4SponsorshipAssessment {
  const text = `${input.roleTitle}\n${input.rawText ?? ""}`.toLowerCase();
  const country = input.country.trim().toLowerCase();
  const salaryEvidence = input.salary?.trim() || salaryEvidenceFromVacancy(input.rawText);
  const salary = detectAnnualSalaryEur(
    salaryEvidence,
    country === "united kingdom" || country === "uk" ? "GBP" : "EUR",
  );
  const occupation = occupationLane(input.roleTitle);
  const blockers: string[] = [];
  const evidence: string[] = [];
  let threshold: number | null = null;
  let pathway = "Manual immigration assessment required";
  let thresholdRule: ThresholdRule | null = null;
  let legalEligibility = 35;
  let employerProbability = 30;

  if (negativeSignals.some((signal) => text.includes(signal))) {
    blockers.push("Vacancy states that existing work authorisation is required or sponsorship is unavailable.");
    employerProbability = 5;
  }
  if (positiveSignals.some((signal) => text.includes(signal))) {
    evidence.push("Vacancy contains an explicit sponsorship, permit or relocation-support signal.");
    employerProbability += 40;
  }

  if (country === "united kingdom" || country === "uk") {
    thresholdRule = thresholdRules.uk;
    legalEligibility = occupation.confidence === "High" ? 70 : occupation.confidence === "Medium" ? 55 : 32;
  } else if (country === "ireland") {
    thresholdRule = occupation.confidence === "Low" ? thresholdRules.irelandHighSalary : thresholdRules.ireland;
    legalEligibility = occupation.confidence === "High" ? 72 : occupation.confidence === "Medium" ? 58 : 35;
  } else if (country === "netherlands") {
    thresholdRule = thresholdRules.netherlands;
    legalEligibility = 48;
  } else if (country === "germany") {
    thresholdRule = thresholdRules.germany;
    legalEligibility = 52;
  }

  if (thresholdRule) {
    threshold = thresholdRule.annualThresholdEur;
    pathway = thresholdRule.pathway;
  }

  if (salary !== null && threshold !== null && salary < threshold) {
    blockers.push(`Detected salary €${salary.toLocaleString()} is below the default €${threshold.toLocaleString()} pathway threshold.`);
  } else if (salary !== null && threshold !== null) {
    legalEligibility += 18;
    evidence.push(`Detected salary meets the default €${threshold.toLocaleString()} threshold.`);
  }

  legalEligibility = Math.max(0, Math.min(100, legalEligibility - blockers.length * 32));
  employerProbability = Math.max(0, Math.min(100, employerProbability));
  const status: Stamp4SponsorshipAssessment["status"] = blockers.length
    ? legalEligibility < 20 ? "Ineligible" : "Unlikely"
    : legalEligibility >= 75 && employerProbability >= 60 ? "Eligible"
    : legalEligibility >= 55 && employerProbability >= 40 ? "Likely"
    : "Confirmation Required";

  return {
    status,
    pathway,
    occupationCode: occupation.code,
    occupationConfidence: occupation.confidence,
    salaryDetectedEUR: salary,
    salaryThresholdEUR: threshold,
    blockers,
    checkedAt,
    rulesetVersion: SPONSORSHIP_RULESET_VERSION,
    rulesetEffectiveAt: SPONSORSHIP_RULESET_EFFECTIVE_AT,
    ruleClaims: thresholdRule ? [{
      claimId: thresholdRule.claimId,
      sourceUrl: thresholdRule.sourceUrl,
      sourceReviewedAt: thresholdRule.sourceReviewedAt,
      sourceValue: thresholdRule.sourceValue,
      sourceCurrency: thresholdRule.sourceCurrency,
      sourcePeriod: thresholdRule.sourcePeriod,
      ...(thresholdRule.transformation ? { transformation: thresholdRule.transformation } : {}),
    }] : [],
  };
}
