import { Suspense } from "react";
import DashboardExperience from "../../../components/DashboardExperience";
import CVWorkspace from "../../../components/cv/CVWorkspace";
import ProfileConnect from "../../../components/profile/ProfileConnect";

export default function DashboardProfilePage() {
  return (
    <>
      <DashboardExperience view="profile" />
      <Suspense
        fallback={
          <section className="workflow-page" aria-label="Profile CV loading">
            Loading your CV…
          </section>
        }
      >
        <CVWorkspace embedded />
      </Suspense>
      <ProfileConnect />
    </>
  );
}
