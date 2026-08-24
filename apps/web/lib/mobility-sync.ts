// Shared (client + server) schemas and pure reconciliation logic for
// syncing the international mobility/relocation profile between browser
// local storage and the cloud. Distinct from mobility-profile-repository.ts
// (the server-only database access layer) — everything here is
// validation/comparison logic that can run in the browser too, to decide
// how a local profile and a server profile relate (matching, conflicting,
// local-only, etc.) before any write happens.
import { z } from "zod";
import { mobilityProfileSchema, type MobilityProfile } from "shared";

/** Current schema version for mobility profile consent records; bump alongside any breaking consent-shape change. */
export const mobilityConsentVersion = 1;

/** The possible sync states a mobility profile can be in from the UI's perspective. */
export const mobilitySyncStateSchema = z.enum([
  "local-only",
  "consent-required",
  "upload-pending",
  "syncing",
  "synced",
  "conflict",
  "offline",
  "error",
  "server-disabled",
]);

export type MobilitySyncState = z.infer<typeof mobilitySyncStateSchema>;

/** Validates a mobility profile's consent record: fixed to the current mobilityConsentVersion, plus an ISO grant timestamp. */
export const mobilityConsentSchema = z.object({
  version: z.literal(mobilityConsentVersion),
  grantedAt: z.string().datetime(),
});

export type MobilityConsent = z.infer<typeof mobilityConsentSchema>;

/** Validates the shape of a mobility profile record as returned by the server. */
export const mobilityServerRecordSchema = z.object({
  profile: mobilityProfileSchema,
  schemaVersion: z.literal(1),
  updatedAt: z.string().datetime(),
  ownerContext: z.literal("authenticated-user"),
  consent: mobilityConsentSchema,
  syncEnabled: z.boolean(),
});

export type MobilityServerRecord = z.infer<typeof mobilityServerRecordSchema>;

/** Validates the {data, error} envelope shape returned by the mobility profile API route. */
export const mobilityApiResponseSchema = z.object({
  data: mobilityServerRecordSchema.nullable(),
  error: z.string().nullable(),
});

/** The outcome of comparing a local mobility profile against the server's copy, as produced by reconcileMobilityProfiles. */
export type MobilityReconciliation =
  | { kind: "empty"; profile: MobilityProfile }
  | { kind: "local-only"; profile: MobilityProfile }
  | { kind: "server-only"; profile: MobilityProfile }
  | { kind: "matching"; profile: MobilityProfile }
  | {
      kind: "conflict";
      localProfile: MobilityProfile;
      serverProfile: MobilityProfile;
    }
  | { kind: "malformed-local"; profile: MobilityProfile };

/** Serialises `profile` with its keys sorted alphabetically, so two structurally-equal profiles produce an identical string regardless of key order. */
function stableProfile(profile: MobilityProfile) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(mobilityProfileSchema.parse(profile)).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
  );
}

/** True if `left` and `right` are structurally equal (via stableProfile's key-order-independent comparison). */
export function mobilityProfilesMatch(
  left: MobilityProfile,
  right: MobilityProfile,
) {
  return stableProfile(left) === stableProfile(right);
}

/**
 * Decides how a local mobility profile relates to the server's copy (or lack
 * thereof): "malformed-local" if the local copy failed validation,
 * "server-only"/"empty"/"local-only" depending on which side has data,
 * "matching" if both sides hold the same profile, or "conflict" if they
 * differ and both are present — the caller (a sync hook/component) decides
 * how to present each case to the user.
 */
export function reconcileMobilityProfiles({
  emptyProfile,
  local,
  localKind,
  server,
}: {
  emptyProfile: MobilityProfile;
  local: MobilityProfile;
  localKind: "empty" | "saved" | "legacy-migration" | "malformed";
  server: MobilityServerRecord | null;
}): MobilityReconciliation {
  if (localKind === "malformed")
    return { kind: "malformed-local", profile: emptyProfile };
  if (server && localKind === "empty")
    return { kind: "server-only", profile: server.profile };
  if (!server && localKind === "empty")
    return { kind: "empty", profile: emptyProfile };
  if (!server) return { kind: "local-only", profile: local };
  if (mobilityProfilesMatch(local, server.profile))
    return { kind: "matching", profile: server.profile };
  return {
    kind: "conflict",
    localProfile: local,
    serverProfile: server.profile,
  };
}

/**
 * Validates a raw server response after writing a mobility profile and
 * confirms the persisted profile actually matches what was sent (`expected`).
 * Throws if the response has an error, no data, or a profile that doesn't
 * match — guarding against silently trusting a write that didn't actually
 * persist the intended content.
 */
export function confirmPersistedMobilityProfile({
  expected,
  response,
}: {
  expected: MobilityProfile;
  response: unknown;
}): MobilityServerRecord {
  const parsed = mobilityApiResponseSchema.parse(response);
  if (
    parsed.error ||
    !parsed.data ||
    !mobilityProfilesMatch(expected, parsed.data.profile)
  ) {
    throw new Error("The saved account copy could not be confirmed.");
  }
  return parsed.data;
}
