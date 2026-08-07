import "server-only";
import { createAdminClient } from "./supabase/admin";

export type AdminFeedbackRow = {
  category: string;
  createdAt: string;
  id: string;
  message: string;
  productArea: string;
  rating: number | null;
  route: string | null;
  status: "New" | "Reviewing" | "Planned" | "Resolved" | "Closed";
};

export async function getAdminFeedbackOverview(): Promise<AdminFeedbackRow[]> {
  const { data, error } = await createAdminClient()
    .from("beta_feedback")
    .select("id, category, rating, message, product_area, route, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("feedback_source_unavailable");
  return (data ?? []).map((row) => ({
    category: row.category,
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    productArea: row.product_area,
    rating: row.rating,
    route: row.route,
    status: row.status,
  }));
}
