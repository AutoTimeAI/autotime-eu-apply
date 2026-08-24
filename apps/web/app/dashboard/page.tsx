/**
 * The /dashboard landing route.
 *
 * Renders `HomeExperience`, the client-side home/overview surface shown
 * inside the authenticated dashboard shell. Passes `testMode` (derived from
 * `isTestAuthEnabled`) through so the home experience can adapt when the
 * app is running under the test-auth bypass rather than real Supabase auth.
 */
import HomeExperience from "../../components/HomeExperience";
import { isTestAuthEnabled } from "../../lib/test-auth";

export default function DashboardPage() {
  return <HomeExperience testMode={isTestAuthEnabled()} />;
}
