/**
 * Legacy route shim for /dashboard/match-score.
 *
 * Match scoring is now surfaced inside the jobs workspace, so this route
 * just redirects old links to /dashboard/jobs.
 */
import { redirect } from "next/navigation";

export default function DashboardMatchScorePage() {
  redirect("/dashboard/jobs");
}
