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

export function isValidLinkedInProfile(value: string | null | undefined): boolean {
  try {
    const url = new URL(value ?? "");
    const validHost = url.hostname === "linkedin.com" || url.hostname.endsWith(".linkedin.com");
    return ["http:", "https:"].includes(url.protocol) && validHost && /^\/in\/[^/]+\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

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

export function hasCompletedRequiredOnboarding(profile: OnboardingEvidence | null): boolean {
  return Boolean(
    profile?.onboarding_completed_at &&
      getMissingOnboardingEvidence(profile).length === 0,
  );
}
