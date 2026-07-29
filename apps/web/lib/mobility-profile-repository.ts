import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mobilityProfileSchema, type MobilityProfile } from "shared";
import { mobilityConsentSchema, type MobilityConsent } from "./mobility-sync";
import type { Database, Json } from "./supabase/types";

export const mobilityServerSyncEnabled =
  process.env.AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED === "true";

export const mobilityWriteRequestSchema = z
  .object({
    profile: mobilityProfileSchema.strict(),
    consent: mobilityConsentSchema,
    expectedUpdatedAt: z.string().datetime().nullable(),
  })
  .strict();

export type MobilityProfileRecord = {
  profile: MobilityProfile;
  schemaVersion: 1;
  updatedAt: string;
  ownerContext: "authenticated-user";
  consent: MobilityConsent;
  syncEnabled: boolean;
};

export class MobilityConflictError extends Error {
  constructor() {
    super("The account copy changed before this update was saved.");
    this.name = "MobilityConflictError";
  }
}

type MobilityRow = Pick<
  Database["public"]["Tables"]["mobility_profiles"]["Row"],
  | "profile"
  | "schema_version"
  | "updated_at"
  | "consent_version"
  | "consent_granted_at"
  | "sync_enabled"
>;

function recordFromRow(row: MobilityRow): MobilityProfileRecord {
  if (row.schema_version !== 1 || row.consent_version !== 1) {
    throw new Error("Unsupported mobility profile schema version.");
  }
  return {
    profile: mobilityProfileSchema.parse(row.profile),
    schemaVersion: 1,
    updatedAt: row.updated_at,
    ownerContext: "authenticated-user",
    consent: mobilityConsentSchema.parse({
      version: row.consent_version,
      grantedAt: row.consent_granted_at,
    }),
    syncEnabled: row.sync_enabled,
  };
}

const selection =
  "profile,schema_version,updated_at,consent_version,consent_granted_at,sync_enabled" as const;

export async function readMobilityProfile(
  client: SupabaseClient<Database>,
  authenticatedUserId: string,
): Promise<MobilityProfileRecord | null> {
  const { data, error } = await client
    .from("mobility_profiles")
    .select(selection)
    .eq("user_id", authenticatedUserId)
    .maybeSingle();

  if (error) throw new Error("Mobility profile read failed.");
  return data ? recordFromRow(data) : null;
}

export async function upsertMobilityProfile(
  client: SupabaseClient<Database>,
  authenticatedUserId: string,
  input: unknown,
): Promise<MobilityProfileRecord> {
  const { profile, consent, expectedUpdatedAt } =
    mobilityWriteRequestSchema.parse(input);
  const existing = await readMobilityProfile(client, authenticatedUserId);

  if (existing && existing.updatedAt !== expectedUpdatedAt)
    throw new MobilityConflictError();
  if (!existing && expectedUpdatedAt !== null)
    throw new MobilityConflictError();

  const payload = {
    profile: profile as Json,
    schema_version: profile.schemaVersion,
    consent_version: consent.version,
    consent_granted_at: consent.grantedAt,
    sync_enabled: true,
  };
  const query = existing
    ? client
        .from("mobility_profiles")
        .update(payload)
        .eq("user_id", authenticatedUserId)
        .eq("updated_at", existing.updatedAt)
    : client.from("mobility_profiles").insert({
        ...payload,
        user_id: authenticatedUserId,
      });
  const { data, error } = await query.select(selection).maybeSingle();

  if (error?.code === "23505" || (!error && !data))
    throw new MobilityConflictError();
  if (error || !data) throw new Error("Mobility profile write failed.");
  return recordFromRow(data);
}

export async function disableMobilitySync(
  client: SupabaseClient<Database>,
  authenticatedUserId: string,
) {
  const { error } = await client
    .from("mobility_profiles")
    .update({ sync_enabled: false })
    .eq("user_id", authenticatedUserId);
  if (error) throw new Error("Mobility sync could not be disabled.");
}

export async function deleteMobilityProfile(
  client: SupabaseClient<Database>,
  authenticatedUserId: string,
) {
  const { error } = await client
    .from("mobility_profiles")
    .delete()
    .eq("user_id", authenticatedUserId);
  if (error) throw new Error("Mobility profile deletion failed.");
}
