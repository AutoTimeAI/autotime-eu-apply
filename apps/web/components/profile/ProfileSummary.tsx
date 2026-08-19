"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductEmptyState, ProductPageHeader } from "../product-ui";

type Profile = {
  alert_frequency: "daily" | "weekly" | "off";
  alert_last_sent_at: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  country_current: string | null;
  countries_target: string[];
  work_right_details: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  base_cv_text: string;
  onboarding_completed_at: string | null;
};

export default function ProfileSummary() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [alertStatus, setAlertStatus] = useState("");
  const [status, setStatus] = useState("Loading profile…");

  useEffect(() => {
    void fetch("/api/profile/onboarding")
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok) {
          setStatus(payload.error);
          return;
        }
        setProfile(payload.data);
        setStatus("");
      });
  }, []);

  if (status) return <section className="workflow-page"><p role="status">{status}</p></section>;
  if (!profile?.onboarding_completed_at) {
    return <section className="workflow-page"><ProductEmptyState title="Complete your profile setup" description="The onboarding wizard collects your basic information, links, photo, and CV evidence."/><Link className="button-primary" href="/dashboard/onboarding">Start setup</Link></section>;
  }

  const links = [
    ["LinkedIn", profile.linkedin_url],
    ["GitHub", profile.github_url],
    ["Portfolio", profile.portfolio_url],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  async function updateAlertFrequency(
    frequency: Profile["alert_frequency"],
  ) {
    setAlertStatus("Saving alert preference...");
    const response = await fetch("/api/profile/alerts", {
      body: JSON.stringify({ frequency }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    const payload = await response.json();
    if (!response.ok) {
      setAlertStatus(payload.error ?? "Job alert preference could not be saved.");
      return;
    }
    setProfile((current) =>
      current ? { ...current, alert_frequency: frequency } : current,
    );
    setAlertStatus("Job alert preference saved.");
  }

  return (
    <main className="workflow-page profile-page">
      <ProductPageHeader eyebrow="Profile" title={profile.full_name || "Your profile"} description="Your confirmed personal details, target markets, professional links and canonical CV."/>

      <div className="profile-summary-grid">
        <section className="workflow-section profile-card profile-identity-card">
          <div className="profile-card-heading">
            <div className="profile-avatar-wrap">
              {profile.photoUrl ? <img className="profile-onboarding-photo" src={profile.photoUrl} alt={`${profile.full_name} profile`}/> : <span className="profile-avatar-placeholder" aria-hidden="true">{profile.full_name?.trim().charAt(0).toUpperCase() || "P"}</span>}
            </div>
            <div><p className="product-eyebrow">Personal details</p><h2>Contact</h2></div>
          </div>
          <dl className="profile-detail-list">
            <div><dt>Email</dt><dd>{profile.email || "Not recorded"}</dd></div>
            <div><dt>Phone</dt><dd>{profile.phone || "Not recorded"}</dd></div>
          </dl>
          <div className="profile-card-actions"><Link className="button-secondary" href="/dashboard/onboarding?edit=basic">Edit contact</Link><Link className="text-link" href="/dashboard/onboarding?edit=photo">Change photo</Link></div>
        </section>

        <section className="workflow-section profile-card">
          <div className="profile-card-heading"><div><p className="product-eyebrow">Mobility</p><h2>Location and work rights</h2></div></div>
          <dl className="profile-detail-list">
            <div><dt>Current location</dt><dd>{profile.country_current || "Not recorded"}</dd></div>
            <div><dt>Target countries</dt><dd>{profile.countries_target.join(", ") || "Not recorded"}</dd></div>
            <div className="profile-detail-wide"><dt>Work authorisation</dt><dd>{profile.work_right_details || "Not recorded"}</dd></div>
          </dl>
          <div className="profile-card-actions"><Link className="button-secondary" href="/dashboard/onboarding?edit=basic">Edit locations</Link><Link className="text-link" href="/dashboard/onboarding?edit=work-authorisation">Review work rights</Link></div>
        </section>

        <section className="workflow-section profile-card profile-links-card">
          <div className="profile-card-heading"><div><p className="product-eyebrow">Online presence</p><h2>Professional links</h2></div></div>
          {links.length ? <ul className="profile-link-list">{links.map(([label, url]) => <li key={label}><a href={url} rel="noreferrer" target="_blank">{label}<span aria-hidden="true">↗</span></a></li>)}</ul> : <p className="profile-empty-value">No professional links added.</p>}
          <div className="profile-card-actions"><Link className="button-secondary" href="/dashboard/onboarding?edit=urls">Edit links</Link></div>
        </section>

        <section className="workflow-section profile-card profile-alert-card">
          <div className="profile-card-heading">
            <div>
              <p className="product-eyebrow">Matched-job digest</p>
              <h2>Email job alerts</h2>
              <p>Receive new ESCO matches with their skill evidence.</p>
            </div>
          </div>
          <label htmlFor="profile-alert-frequency">Frequency</label>
          <select
            id="profile-alert-frequency"
            value={profile.alert_frequency ?? "weekly"}
            onChange={(event) =>
              void updateAlertFrequency(
                event.target.value as Profile["alert_frequency"],
              )
            }
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="off">Off</option>
          </select>
          <p className="profile-empty-value">
            Last sent:{" "}
            {profile.alert_last_sent_at
              ? new Date(profile.alert_last_sent_at).toLocaleString("en-GB")
              : "Not sent yet"}
          </p>
          {alertStatus ? (
            <p aria-live="polite" role="status">
              {alertStatus}
            </p>
          ) : null}
        </section>
      </div>

      <section className="workflow-section profile-card profile-cv-card">
        <div className="profile-card-heading profile-cv-heading"><div><p className="product-eyebrow">Canonical document</p><h2>CV evidence</h2><p>Your saved source CV is used for job-specific tailoring.</p></div><Link className="button-secondary" href="/dashboard/onboarding?edit=cv">Replace or rebuild CV</Link></div>
        {profile.base_cv_text ? <pre className="profile-cv-text">{profile.base_cv_text}</pre> : <p className="profile-empty-value">No CV evidence saved.</p>}
      </section>
    </main>
  );
}
