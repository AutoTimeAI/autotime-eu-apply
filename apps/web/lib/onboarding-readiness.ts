// Defines what counts as "required onboarding evidence" on a profile —
// the minimum set of fields a profile must have filled in (with basic shape
// validation, not just presence) before the app treats onboarding as
// genuinely complete, independent of the stored onboarding_completed_at flag
// alone (which a user could reach without ever filling required fields via
// the older/legacy onboarding flow).
type OnboardingEvidence = {
  full_name?: string | null;
  phone?: string | null;
  country_current?: string | null;
  countries_target?: string[] | null;
  work_right_details?: string | null;
  linkedin_url?: string | null;
  base_cv_text?: string | null;
  onboarding_completed_at?: string | null;
};

const phonePattern = /^\+?[0-9][0-9 ()-]{6,24}$/;

/** True if `value` is a well-formed LinkedIn personal profile URL (http(s), linkedin.com host, `/in/<slug>` path). */
export function isValidLinkedInProfile(value: string | null | undefined): boolean {
  try {
    const url = new URL(value ?? "");
    const validHost = url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");
    return ["http:", "https:"].includes(url.protocol) && validHost && /^\/in\/[^/]+\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/**
 * Lists which required onboarding fields are still missing or invalid on
 * `profile`: full name, a plausible phone number, current country, at least
 * one non-blank target country, work-right details of 10+ characters, a
 * valid LinkedIn profile URL, and CV text of 50+ characters. Returns an
 * empty array once everything required is present.
 */
export function getMissingOnboardingEvidence(profile: OnboardingEvidence): string[] {
  return [
    !profile.full_name?.trim() && "fullName",
    !phonePattern.test(profile.phone?.trim() ?? "") && "phone",
    !profile.country_current?.trim() && "countryCurrent",
    !profile.countries_target?.some((country) => country.trim()) && "countriesTarget",
    (profile.work_right_details?.trim().length ?? 0) < 10 && "workRightDetails",
    !isValidLinkedInProfile(profile.linkedin_url) && "linkedinUrl",
    (profile.base_cv_text?.trim().length ?? 0) < 50 && "baseCvText",
  ].filter((field): field is string => Boolean(field));
}

/** True only if `profile` both has an `onboarding_completed_at` timestamp and passes getMissingOnboardingEvidence with no gaps — either alone is not sufficient. */
export function hasCompletedRequiredOnboarding(profile: OnboardingEvidence | null): boolean {
  return Boolean(
    profile?.onboarding_completed_at &&
      getMissingOnboardingEvidence(profile).length === 0,
  );
}
