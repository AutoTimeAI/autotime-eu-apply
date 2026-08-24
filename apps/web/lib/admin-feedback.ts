/**
 * Builds the unified feedback list shown in the admin dashboard by merging
 * two distinct sources - direct beta_feedback submissions and platform
 * compatibility reports from platform_coverage_reports - into one
 * chronologically sorted row shape. Exists so the admin UI can render a
 * single feed without needing to know about two separate underlying
 * tables/status vocabularies.
 */
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

/**
 * Fetches up to 100 rows each from beta_feedback and (best-effort)
 * platform_coverage_reports, maps coverage reports into the same
 * AdminFeedbackRow shape (prefixing their id with "coverage:" and mapping
 * their platform-report status vocabulary - new/triaged/reproduced/
 * fixed/closed - onto the feedback status labels), merges both lists, sorts
 * by createdAt descending, and returns the top 100. Throws only if the
 * beta_feedback query fails; a failed coverage-report query is silently
 * dropped rather than failing the whole overview.
 */
export async function getAdminFeedbackOverview(): Promise<AdminFeedbackRow[]> {
  const admin = createAdminClient();
  const [feedback, coverage] = await Promise.all([
    admin.from("beta_feedback").select("id, category, rating, message, product_area, route, status, created_at").order("created_at", { ascending: false }).limit(100),
    admin.from("platform_coverage_reports").select("id, platform, site_url, problem_category, description, status, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  if (feedback.error) throw new Error("feedback_source_unavailable");
  const rows: AdminFeedbackRow[] = (feedback.data ?? []).map((row) => ({
    category: row.category,
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    productArea: row.product_area,
    rating: row.rating,
    route: row.route,
    status: row.status,
  }));
  if (!coverage.error) rows.push(...(coverage.data ?? []).map((row) => ({
    category: `Compatibility: ${row.problem_category.replaceAll("_", " ")}`,
    createdAt: row.created_at,
    id: `coverage:${row.id}`,
    message: [row.site_url, row.description].filter(Boolean).join(" — "),
    productArea: row.platform,
    rating: null,
    route: row.site_url,
    status: ({ new:"New", triaged:"Reviewing", reproduced:"Planned", fixed:"Resolved", closed:"Closed" } as const)[row.status as "new"|"triaged"|"reproduced"|"fixed"|"closed"],
  })));
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}
