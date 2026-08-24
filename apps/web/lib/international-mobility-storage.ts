/**
 * Persists the user's international-mobility profile and consent to a
 * pluggable key-value Storage (e.g. browser localStorage), per-user-scoped
 * by key. Also handles one-time migration from an older, differently
 * shaped "companion dashboard" candidate-profile storage format into the
 * current MobilityProfile schema, so users who saved data under the legacy
 * format don't lose it.
 */
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

/** Trims `userId` and throws if the result is empty - every storage key here must be scoped to a real user. */
function requireUserId(userId: string) {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error("An authenticated user ID is required for mobility data.");
  }
  return normalized;
}

/** Storage key for a user's mobility profile. Throws if `userId` is blank. */
export function getMobilityStorageKey(userId: string) {
  return `${mobilityStoragePrefix}:${requireUserId(userId)}`;
}

/** Storage key for a user's mobility consent record. Throws if `userId` is blank. */
export function getMobilityConsentKey(userId: string) {
  return `${mobilityConsentPrefix}:${requireUserId(userId)}`;
}

/** Storage key for the legacy "companion dashboard" candidate-profile data this module migrates from. Throws if `userId` is blank. */
export function getLegacyDashboardStorageKey(userId: string) {
  return `${dashboardStoragePrefix}:${requireUserId(userId)}`;
}

/** Parses `value` as JSON, returning null (never throwing) for a null input or invalid JSON. */
function parseJson(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Loads a user's mobility profile, trying in order: (1) a valid saved
 * MobilityProfile ("saved"); (2) if saved data exists but fails schema
 * validation, an empty profile tagged "malformed" (the corrupt data is not
 * deleted or repaired here); (3) a legacy candidate-profile record under
 * the old dashboard storage key, migrated via
 * migrateCandidateProfileToMobilityProfile ("legacy-migration"); (4) an
 * empty default profile ("empty") if nothing is found. The `source` field
 * tells callers which path was taken.
 */
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

/** Validates `profile` against the schema (throwing if invalid) and saves it under the user's storage key, returning the validated value. */
export function saveMobilityProfile(
  storage: MobilityStorage,
  userId: string,
  profile: MobilityProfile,
) {
  const validated = mobilityProfileSchema.parse(profile);
  storage.setItem(getMobilityStorageKey(userId), JSON.stringify(validated));
  return validated;
}

/** Removes the user's saved mobility profile from storage. */
export function removeLocalMobilityProfile(
  storage: MobilityStorage,
  userId: string,
) {
  storage.removeItem(getMobilityStorageKey(userId));
}

/** Loads and validates the user's saved mobility consent record, or null if absent/invalid. */
export function loadMobilityConsent(
  storage: MobilityStorage,
  userId: string,
): MobilityConsent | null {
  const parsed = mobilityConsentSchema.safeParse(
    parseJson(storage.getItem(getMobilityConsentKey(userId))),
  );
  return parsed.success ? parsed.data : null;
}

/** Validates `consent` against the schema (throwing if invalid) and saves it under the user's storage key, returning the validated value. */
export function saveMobilityConsent(
  storage: MobilityStorage,
  userId: string,
  consent: MobilityConsent,
) {
  const validated = mobilityConsentSchema.parse(consent);
  storage.setItem(getMobilityConsentKey(userId), JSON.stringify(validated));
  return validated;
}

/** Removes the user's saved mobility consent record from storage. */
export function removeMobilityConsent(
  storage: MobilityStorage,
  userId: string,
) {
  storage.removeItem(getMobilityConsentKey(userId));
}
