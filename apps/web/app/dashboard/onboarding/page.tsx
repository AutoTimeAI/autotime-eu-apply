import { OnboardingWizard } from "../../../components/OnboardingWizard";
import { Suspense } from "react";

export default function DashboardOnboardingPage() {
  return <Suspense fallback={<main className="onboarding-wizard-shell">Loading setup…</main>}><OnboardingWizard /></Suspense>;
}
