/**
 * Legacy route shim for /dashboard/interview (singular).
 *
 * Redirects to the plural /dashboard/interviews list route.
 */
import { redirect } from "next/navigation";

export default function DashboardInterviewPage() {
  redirect("/dashboard/interviews");
}
