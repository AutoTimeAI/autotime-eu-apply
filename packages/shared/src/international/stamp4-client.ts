// Client for Stamp4's sponsorship-check service (see
// stamp4-simple-apply-cockpit's /api/stamp4/simple-apply/sponsorship-check) -
// the real statutory-threshold, occupation-mapped legal-eligibility check
// that exists for UK/Ireland/Netherlands/Germany, composed into
// assessInternationalJob's evidence via InternationalAssessmentInput's
// optional stamp4Assessment field rather than replacing AutoTime's own
// broader text-signal engine. Deliberately server-side only: the request
// carries a shared secret that must never reach the browser, and the
// two products are separate deployments (not a shared workspace), so this
// is a real HTTP call, not an in-process import.
import type { Stamp4SponsorshipAssessment } from "./types.ts";

const STAMP4_SPONSORSHIP_COUNTRY_IDS = new Set(["uk", "ireland", "netherlands", "germany"]);

/** Whether `countryPackId` (a CountryPack.id from getInternationalCountryPack) is one Stamp4 has real legal-threshold data for - AutoTime's own text-signal engine stays the sole authority everywhere else (France, the generic European-explorer countries). */
export function isStamp4SponsorshipCovered(countryPackId: string): boolean {
  return STAMP4_SPONSORSHIP_COUNTRY_IDS.has(countryPackId);
}

export type Stamp4SponsorshipCheckInput = {
  roleTitle: string;
  country: string;
  salary?: string | null;
  rawText?: string;
  domainKeywords?: string[];
  requiredSkills?: string[];
  responsibilities?: string[];
};

type FetchLike = typeof fetch;

/**
 * Calls Stamp4's sponsorship-check service. `baseUrl`/`secret` are required,
 * deliberately not read from `process.env` here - this package has no Node
 * types (it also ships to the browser extension), so environment access
 * belongs to the caller (a Next.js server route), which reads its own
 * STAMP4_SPONSORSHIP_SERVICE_URL/STAMP4_SPONSORSHIP_SERVICE_SECRET and
 * passes them in. Returns null on any failure (missing config, network
 * error, timeout, non-2xx) rather than throwing - this is an enrichment,
 * not a hard dependency, and Stamp4 being unreachable is operationally the
 * same as "no Stamp4 coverage right now", which assessInternationalJob
 * already handles correctly by falling back to its own evidence-first
 * checks.
 */
export async function fetchStamp4SponsorshipAssessment(
  input: Stamp4SponsorshipCheckInput,
  options: { baseUrl: string; secret: string; timeoutMs?: number; fetchImpl?: FetchLike },
): Promise<Stamp4SponsorshipAssessment | null> {
  const { baseUrl, secret } = options;
  if (!baseUrl || !secret) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? 5000);

  try {
    const response = await fetchImpl(
      `${baseUrl.replace(/\/$/, "")}/api/stamp4/simple-apply/sponsorship-check`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
        body: JSON.stringify({ parsed: input }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: Record<string, unknown> };
    if (!body.data) return null;

    // Stamp4's raw SponsorshipReadiness has more fields than AutoTime needs
    // (employerProbability, evidenceStrength, recruiterQuestions, ...) -
    // mapped down to exactly stamp4SponsorshipAssessmentSchema's shape so a
    // change on Stamp4's side that doesn't touch these fields can't silently
    // drift AutoTime's evidence composition.
    const raw = body.data;
    if (
      typeof raw.status !== "string" ||
      typeof raw.pathway !== "string" ||
      typeof raw.occupationCode !== "string" ||
      typeof raw.occupationConfidence !== "string"
    ) {
      return null;
    }

    return {
      status: raw.status as Stamp4SponsorshipAssessment["status"],
      pathway: raw.pathway,
      occupationCode: raw.occupationCode,
      occupationConfidence: raw.occupationConfidence as Stamp4SponsorshipAssessment["occupationConfidence"],
      salaryDetectedEUR: typeof raw.salaryDetectedEUR === "number" ? raw.salaryDetectedEUR : null,
      salaryThresholdEUR: typeof raw.salaryThresholdEUR === "number" ? raw.salaryThresholdEUR : null,
      blockers: Array.isArray(raw.blockers) ? raw.blockers.filter((item): item is string => typeof item === "string") : [],
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
