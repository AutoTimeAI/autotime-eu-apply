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
