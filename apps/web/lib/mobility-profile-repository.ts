// Server-side Supabase repository for the cloud-synced international
// mobility/relocation profile: read, optimistic-locked upsert, disable-sync,
// and delete. Distinct from mobility-sync.ts (shared client/server
// reconciliation logic and Zod schemas) — this file is the actual database
// access layer, feature-gated behind mobilityServerSyncEnabled.
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mobilityProfileSchema, type MobilityProfile } from "shared";
import { mobilityConsentSchema, type MobilityConsent } from "./mobility-sync";
import type { Database, Json } from "./supabase/types";

/** Whether server-side sync of the mobility profile is enabled at all, gated by the AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED env var. */
export const mobilityServerSyncEnabled =
  process.env.AUTOTIME_MOBILITY_SERVER_SYNC_ENABLED === "true";

/** Validates an incoming mobility profile write request body: the profile itself, consent record, and the client's expected current `updatedAt` (for optimistic concurrency). */
export const mobilityWriteRequestSchema = z
  .object({
    profile: mobilityProfileSchema.strict(),
    consent: mobilityConsentSchema,
    expectedUpdatedAt: z.string().datetime().nullable(),
  })
  .strict();

/** A mobility profile record as read from/written to the database, with its consent and sync state. */
export type MobilityProfileRecord = {
  profile: MobilityProfile;
  schemaVersion: 1;
  updatedAt: string;
  ownerContext: "authenticated-user";
  consent: MobilityConsent;
  syncEnabled: boolean;
};

/** Thrown by upsertMobilityProfile when the caller's `expectedUpdatedAt` doesn't match the current stored row (optimistic-concurrency conflict). */
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

/** Maps a raw `mobility_profiles` database row into a validated MobilityProfileRecord. Throws if the row's schema/consent version isn't the currently supported version 1. */
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

/** Reads the authenticated user's mobility profile, or null if none exists yet. Throws on a database error. */
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

/**
 * Validates `input` against mobilityWriteRequestSchema and inserts or updates
 * the user's mobility profile row. Enforces optimistic concurrency: throws
 * MobilityConflictError if an existing row's `updatedAt` doesn't match
 * `expectedUpdatedAt`, if the caller expected no row (`expectedUpdatedAt: null`)
 * but one already exists, or if a unique-constraint violation (a concurrent
 * insert) or an unexpectedly-empty write result occurs.
 */
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

/** Sets `sync_enabled` to false on the user's mobility profile row, without deleting it. Throws on a database error. */
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

/** Permanently deletes the user's mobility profile row. Throws on a database error. */
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
