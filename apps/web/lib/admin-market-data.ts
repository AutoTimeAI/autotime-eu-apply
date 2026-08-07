import "server-only";
import { createAdminClient } from "./supabase/admin";

export type AdminMarketRefreshRequest = {
  completedAt: string | null;
  createdAt: string;
  failureReason: string | null;
  id: string;
  idempotencyKey: string;
  status: "requested" | "running" | "succeeded" | "failed";
};

export async function getLatestAdminMarketRefreshRequest(): Promise<AdminMarketRefreshRequest | null> {
  const { data, error } = await createAdminClient()
    .from("market_refresh_requests")
    .select("id, idempotency_key, status, failure_reason, created_at, completed_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("market_data_source_unavailable");
  if (!data) return null;
  return {
    completedAt: data.completed_at,
    createdAt: data.created_at,
    failureReason: data.failure_reason,
    id: data.id,
    idempotencyKey: data.idempotency_key,
    status: data.status,
  };
}
