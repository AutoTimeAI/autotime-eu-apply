/**
 * Governs the admin audit trail: the closed set of actions/target types an
 * audit event may record, a metadata scrubber that keeps audit rows free of
 * incidental sensitive data, and a reader for the audit log shown in the
 * admin UI. Existing as its own module keeps the audit vocabulary (and its
 * allowlist) centralized so every code path writing an audit event agrees
 * on what is loggable.
 */
import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { Json } from "./supabase/types";

export const adminAuditActions = ["admin_owner_bootstrapped", "admin_owner_recovery_suspended", "beta_access_suspended", "beta_access_restored", "feature_flag_updated", "market_refresh_requested"] as const;
export const adminAuditTargetTypes = ["admin_membership", "beta_access", "feature_flag", "market_data"] as const;
export type AdminAuditAction = (typeof adminAuditActions)[number];
export type AdminAuditTargetType = (typeof adminAuditTargetTypes)[number];
const allowedMetadataKeys = new Set(["reason", "previousStatus", "nextStatus", "flagKey", "enabled", "version", "provider"]);
/**
 * Reduces arbitrary audit metadata down to an explicit allowlist of keys
 * (dropping anything else), and coerces each surviving value to a string
 * truncated to 180 characters. This is the only sanctioned way to shape
 * metadata before it is persisted to admin_audit_events, so an audit event
 * can never accidentally carry free-form or oversized data.
 */
export function minimiseAdminAuditMetadata(metadata: Record<string, unknown> = {}): Json {
  return Object.fromEntries(Object.entries(metadata)
    .filter(([key, value]) => allowedMetadataKeys.has(key) && ["string", "number", "boolean"].includes(typeof value))
    .map(([key, value]) => [key, String(value).slice(0, 180)]));
}

export type AdminAuditEvent = {
  actorUserId: string;
  createdAt: string;
  id: string;
  metadata: Json;
  targetId: string | null;
  targetType: string;
  action: string;
};

/**
 * Reads the 100 most recent admin audit events, newest first. Throws if the
 * underlying query fails.
 */
export async function getAdminAuditLog(): Promise<AdminAuditEvent[]> {
  const { data, error } = await createAdminClient()
    .from("admin_audit_events")
    .select("id, actor_user_id, action, target_type, target_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("audit_log_source_unavailable");
  return (data ?? []).map((row) => ({
    actorUserId: row.actor_user_id,
    createdAt: row.created_at,
    id: row.id,
    metadata: row.metadata,
    targetId: row.target_id,
    targetType: row.target_type,
    action: row.action,
  }));
}
