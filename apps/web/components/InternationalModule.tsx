"use client";

// Top-level shell for the "Countries" / International Applications area
// (mobility, sponsorship and work-permission evidence). Owns the currently
// selected country and the tab-like `section` state, and composes the five
// international/* sub-views (overview, per-country workspace, mobility
// profile form + sync panel, sponsor-employer guidance, official sources)
// around a single `MobilityProfile` and derived `InternationalAssessment`.
// Deliberately framed as decision support, not immigration advice — see the
// footer disclaimer rendered on every section.

import { useEffect, useMemo, useState } from "react";
import {
  assessInternationalJob,
  getInternationalCountryPack,
  type MobilityProfile,
} from "shared";
import {
  emptyMobilityProfile,
  loadMobilityProfile,
  saveMobilityProfile,
} from "../lib/international-mobility-storage";
import { CountryWorkspace } from "./international/CountryWorkspace";
import { InternationalOverview } from "./international/InternationalOverview";
import { InternationalSectionNavigation } from "./international/InternationalSectionNavigation";
import { MobilityProfileForm } from "./international/MobilityProfileForm";
import { MobilityPersistencePanel } from "./international/MobilityPersistencePanel";
import { useMobilityPersistence } from "./international/useMobilityPersistence";
import { OfficialSourcesPanel } from "./international/OfficialSourcesPanel";
import { SponsorEvidenceGuide } from "./international/SponsorEvidenceGuide";
import {
  profileCompleteness,
  type InternationalSection,
} from "./international/model";
import { useDashboardPlan } from "./UserNav";

/**
 * Renders the International/mobility workspace: loads the user's saved
 * `MobilityProfile` from local storage on mount (flagging a status message
 * if it was migrated from a legacy format), derives an
 * `InternationalAssessment` for the selected country + pasted job text via
 * `assessInternationalJob` (recomputed with `useMemo` as inputs change),
 * and switches between five sections via `InternationalSectionNavigation`.
 * Saving the mobility profile also notifies `useMobilityPersistence` so it
 * can offer to sync the change to the account.
 */
export function InternationalModule() {
  const { userId } = useDashboardPlan();
  const [section, setSection] = useState<InternationalSection>("overview");
  const [profile, setProfile] = useState<MobilityProfile>(emptyMobilityProfile);
  const [selectedCountry, setSelectedCountry] = useState("Ireland");
  const [jobText, setJobText] = useState("");
  const [status, setStatus] = useState("");
  const persistence = useMobilityPersistence({ profile, setProfile, userId });

  useEffect(() => {
    const loaded = loadMobilityProfile(localStorage, userId);
    setProfile(loaded.profile);
    setSelectedCountry(loaded.profile.targetCountries[0] ?? "Ireland");
    if (loaded.source === "legacy-migration") {
      setStatus(
        "Legacy profile evidence was copied for review. Save only after checking it.",
      );
    }
  }, [userId]);

  const pack = getInternationalCountryPack(selectedCountry);
  const completeness = profileCompleteness(profile);
  const assessment = useMemo(
    () =>
      assessInternationalJob({
        country: selectedCountry,
        mobilityProfile: profile,
        jobText,
        roleDuties: jobText,
        occupationMapping: "not-checked",
      }),
    [jobText, profile, selectedCountry],
  );

  const saveProfile = () => {
    try {
      const saved = saveMobilityProfile(localStorage, userId, {
        ...profile,
        lastVerifiedAt: new Date().toISOString(),
      });
      setProfile(saved);
      setStatus("Mobility profile saved in this browser for your account.");
      persistence.markLocalChange();
    } catch (error: unknown) {
      setStatus(
        error instanceof Error ? error.message : "Check the mobility details.",
      );
    }
  };

  return (
    <main className="international-shell phase-five-countries">
      <header className="international-hero">
        <div>
          <p className="eyebrow">Optional workspace</p>
          <h1>International applications</h1>
          <p>
            Build an evidence-led view of work permission, sponsorship and
            relocation before investing in an application.
          </p>
        </div>
        <button onClick={() => setSection("mobility")} type="button">
          Review my mobility
        </button>
      </header>

      <InternationalSectionNavigation section={section} onChange={setSection} />
      {section === "overview" ? (
        <InternationalOverview
          assessment={assessment}
          completeness={completeness}
          pack={pack}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          onSectionChange={setSection}
        />
      ) : null}
      {section === "country" ? (
        <CountryWorkspace
          assessment={assessment}
          jobText={jobText}
          pack={pack}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          onJobTextChange={setJobText}
        />
      ) : null}
      {section === "mobility" ? (
        <>
          <MobilityProfileForm
            completeness={completeness}
            profile={profile}
            status={status}
            onProfileChange={setProfile}
            onSubmit={saveProfile}
          />
          <div className="international-content">
            <MobilityPersistencePanel persistence={persistence} />
          </div>
        </>
      ) : null}
      {section === "employers" ? <SponsorEvidenceGuide pack={pack} /> : null}
      {section === "sources" ? <OfficialSourcesPanel /> : null}

      <footer className="international-boundary">
        AutoTime provides job-search decision support, not immigration advice or
        an official eligibility decision.
      </footer>
    </main>
  );
}
