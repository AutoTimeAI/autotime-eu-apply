import { z } from "zod";
import { mobilityProfileSchema, type MobilityProfile } from "shared";

export const mobilityConsentVersion = 1;

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

export const mobilityConsentSchema = z.object({
  version: z.literal(mobilityConsentVersion),
  grantedAt: z.string().datetime(),
});

export type MobilityConsent = z.infer<typeof mobilityConsentSchema>;

export const mobilityServerRecordSchema = z.object({
  profile: mobilityProfileSchema,
  schemaVersion: z.literal(1),
  updatedAt: z.string().datetime(),
  ownerContext: z.literal("authenticated-user"),
  consent: mobilityConsentSchema,
  syncEnabled: z.boolean(),
});

export type MobilityServerRecord = z.infer<typeof mobilityServerRecordSchema>;

export const mobilityApiResponseSchema = z.object({
  data: mobilityServerRecordSchema.nullable(),
  error: z.string().nullable(),
});

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

function stableProfile(profile: MobilityProfile) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(mobilityProfileSchema.parse(profile)).sort(([a], [b]) =>
        a.localeCompare(b),
      ),
    ),
  );
}

export function mobilityProfilesMatch(
  left: MobilityProfile,
  right: MobilityProfile,
) {
  return stableProfile(left) === stableProfile(right);
}

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
