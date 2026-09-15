import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "./supabase/admin"

export type AdminMobilityCorrection = {
  id: string
  originalDecisionId: string
  reason: string
  state: "submitted" | "triaged"
  submittedAt: string
  targetId: string
  targetType: string
}

export async function getOpenMobilityCorrections(): Promise<AdminMobilityCorrection[]> {
  const db = createAdminClient() as unknown as SupabaseClient<any>
  const result = await db.from("mobility_decision_corrections")
    .select("id,original_decision_id,target_type,target_id,reason,state,submitted_at")
    .in("state", ["submitted", "triaged"])
    .order("submitted_at", { ascending: true })
    .limit(100)
  if (result.error) throw new Error("mobility_correction_queue_unavailable")
  return (result.data ?? []).map((row) => ({
    id: row.id,
    originalDecisionId: row.original_decision_id,
    reason: row.reason,
    state: row.state,
    submittedAt: row.submitted_at,
    targetId: row.target_id,
    targetType: row.target_type,
  }))
}
