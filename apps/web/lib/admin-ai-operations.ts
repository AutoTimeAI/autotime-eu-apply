/**
 * Data access for the admin "AI operations" dashboard panel: whether the
 * NVIDIA AI provider is configured, plus a recent window of warn/severe
 * provider failures pulled from the operational_logs table. Kept separate
 * from the general admin-monitoring overview since AI provider health is
 * read by its own permission-gated admin route.
 */
import "server-only";
import { createAdminClient } from "./supabase/admin";

export type AdminProviderFailure = {
  area: string;
  code: string;
  createdAt: string;
  httpStatus: number | null;
  id: string;
  level: "severe" | "warn" | "info";
  message: string;
};

export type AdminAiOperationsOverview = {
  nvidiaConfigured: boolean;
  recentFailures: AdminProviderFailure[];
};

/**
 * Fetches the AI operations overview: whether an NVIDIA API key is present
 * in the environment, and up to 50 warn/severe entries logged under the
 * "ai" area of operational_logs in the last 24 hours, newest first.
 * Throws if the underlying query fails.
 */
export async function getAdminAiOperationsOverview(): Promise<AdminAiOperationsOverview> {
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const { data, error } = await createAdminClient()
    .from("operational_logs")
    .select("id, level, area, code, message, http_status, created_at")
    .eq("area", "ai")
    .in("level", ["warn", "severe"])
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("ai_operations_source_unavailable");
  return {
    nvidiaConfigured: Boolean(process.env.NVIDIA_API_KEY),
    recentFailures: (data ?? []).map((row) => ({
      area: row.area,
      code: row.code,
      createdAt: row.created_at,
      httpStatus: row.http_status,
      id: row.id,
      level: row.level,
      message: row.message,
    })),
  };
}
