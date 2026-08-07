import "server-only";
import { createAdminClient } from "./supabase/admin";
import type { Json } from "./supabase/types";

export const adminAuditActions = ["admin_owner_bootstrapped", "admin_owner_recovery_suspended", "beta_access_suspended", "beta_access_restored", "feature_flag_updated", "market_refresh_requested"] as const;
export const adminAuditTargetTypes = ["admin_membership", "beta_access", "feature_flag", "market_data"] as const;
export type AdminAuditAction = (typeof adminAuditActions)[number];
export type AdminAuditTargetType = (typeof adminAuditTargetTypes)[number];
const allowedMetadataKeys = new Set(["reason", "previousStatus", "nextStatus", "flagKey", "enabled", "version", "provider"]);
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
