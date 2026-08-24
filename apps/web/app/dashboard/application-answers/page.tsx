/**
 * Legacy route shim for /dashboard/application-answers.
 *
 * Application answers are now managed inside the applications workspace,
 * so this route exists only to redirect old links/bookmarks to
 * /dashboard/applications instead of 404ing.
 */
import { redirect } from "next/navigation";

export default function DashboardApplicationAnswersPage() {
  redirect("/dashboard/applications");
}
