import {
  candidateProfileSchema,
  migrateCandidateProfileToMobilityProfile,
  mobilityProfileSchema,
  type MobilityProfile,
} from "shared";
import { mobilityConsentSchema, type MobilityConsent } from "./mobility-sync.ts";

export type MobilityStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

const mobilityStoragePrefix = "autotime-international-mobility:v1";
const mobilityConsentPrefix = "autotime-international-consent:v1";
const dashboardStoragePrefix = "autotime-v2-companion-dashboard";

export type MobilityProfileLoadResult = {
  profile: MobilityProfile;
  source: "saved" | "legacy-migration" | "empty" | "malformed";
};

export const emptyMobilityProfile: MobilityProfile = {
  schemaVersion: 1,
  currentCountry: "",
  targetCountries: ["Ireland"],
  applicantPosition: "unsure",
  sponsorshipRequired: "unsure",
  relocationPreference: "depends",
};

function requireUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("An authenticated user ID is required for mobility data.");
  }
  return normalized;
}

export function getMobilityStorageKey(userId: string) {
  return `${mobilityStoragePrefix}:${requireUserId(userId)}`;
}

export function getMobilityConsentKey(userId: string) {
  return `${mobilityConsentPrefix}:${requireUserId(userId)}`;
}

export function getLegacyDashboardStorageKey(userId: string) {
  return `${dashboardStoragePrefix}:${requireUserId(userId)}`;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function loadMobilityProfile(
  storage: MobilityStorage,
  userId: string,
): MobilityProfileLoadResult {
  const rawSaved = storage.getItem(getMobilityStorageKey(userId));
  const saved = mobilityProfileSchema.safeParse(parseJson(rawSaved));
  if (saved.success) return { profile: saved.data, source: "saved" };
  if (rawSaved !== null)
    return { profile: { ...emptyMobilityProfile }, source: "malformed" };

  const legacyState = parseJson(
    storage.getItem(getLegacyDashboardStorageKey(userId)),
  );
  const legacyProfile =
    typeof legacyState === "object" && legacyState !== null
      ? candidateProfileSchema.safeParse(
          (legacyState as Record<string, unknown>).profile,
        )
      : null;
  if (legacyProfile?.success) {
    return {
      profile: migrateCandidateProfileToMobilityProfile(legacyProfile.data),
      source: "legacy-migration",
    };
  }

  return { profile: { ...emptyMobilityProfile }, source: "empty" };
}

export function saveMobilityProfile(
  storage: MobilityStorage,
  userId: string,
  profile: MobilityProfile,
) {
  const validated = mobilityProfileSchema.parse(profile);
  storage.setItem(getMobilityStorageKey(userId), JSON.stringify(validated));
  return validated;
}

export function removeLocalMobilityProfile(
  storage: MobilityStorage,
  userId: string,
) {
  storage.removeItem(getMobilityStorageKey(userId));
}

export function loadMobilityConsent(
  storage: MobilityStorage,
  userId: string,
): MobilityConsent | null {
  const parsed = mobilityConsentSchema.safeParse(
    parseJson(storage.getItem(getMobilityConsentKey(userId))),
  );
  return parsed.success ? parsed.data : null;
}

export function saveMobilityConsent(
  storage: MobilityStorage,
  userId: string,
  consent: MobilityConsent,
) {
  const validated = mobilityConsentSchema.parse(consent);
  storage.setItem(getMobilityConsentKey(userId), JSON.stringify(validated));
  return validated;
}

export function removeMobilityConsent(
  storage: MobilityStorage,
  userId: string,
) {
  storage.removeItem(getMobilityConsentKey(userId));
}
