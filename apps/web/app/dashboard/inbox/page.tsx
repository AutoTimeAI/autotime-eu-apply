/**
 * Legacy route shim for /dashboard/inbox.
 *
 * The job inbox concept was folded into the jobs workspace, so this route
 * just redirects old links to /dashboard/jobs.
 */
import { redirect } from "next/navigation";

export default function DashboardInboxPage() {
  redirect("/dashboard/jobs");
}
