/**
 * Legacy route shim for /dashboard/documents.
 *
 * Document management now lives inside the applications workspace, so this
 * route just redirects old links to /dashboard/applications.
 */
import { redirect } from "next/navigation";

export default function DashboardDocumentsPage() {
  redirect("/dashboard/applications");
}
