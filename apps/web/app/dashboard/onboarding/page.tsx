/**
 * /dashboard/onboarding — first-run setup wizard shown to new users inside
 * the dashboard shell. Wraps `OnboardingWizard` in a `Suspense` boundary
 * (with a simple loading message) since the wizard likely reads client-side
 * state/search params that require suspending.
 */
import { OnboardingWizard } from "../../../components/OnboardingWizard";
import { Suspense } from "react";

export default function DashboardOnboardingPage() {
  return <Suspense fallback={<main className="onboarding-wizard-shell">Loading setup…</main>}><OnboardingWizard /></Suspense>;
}
