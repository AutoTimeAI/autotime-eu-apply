"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductPageHeader } from "../product-ui";
import { CVRenderer } from "./CVRenderer";
import { CVEnrichmentPanel } from "./CVEnrichmentPanel";
import type { CVData } from "../../lib/cv/types";
import { useDashboardPlan } from "../UserNav";
import { loadJobWorkflow } from "../../lib/job-workflow-storage";
const empty: CVData = {
  contact: { name: "", email: "", phone: "", location: "" },
  summary: "",
  experience: [],
  education: [],
  skills: [],
};
type OnboardingProfile = {
  full_name: string;
  email: string | null;
  phone: string | null;
  country_current: string | null;
  countries_target: string[];
  work_right_details: string;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
};
export default function CVWorkspace({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { userId } = useDashboardPlan();
  const router = useRouter();
  const key = `autotime-cv-data:${userId}`;
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job_id");
  const returnTo = searchParams.get("returnTo");
  const [cv, setCv] = useState(empty);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [status, setStatus] = useState("");
  const hasCvContent = Boolean(
    cv.contact.name.trim() ||
      cv.summary.trim() ||
      cv.experience.length ||
      cv.education.length ||
      cv.skills.length,
  );
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") || empty;
      setCv(saved);
      void fetch("/api/profile/onboarding")
        .then(async (response) => ({ response, payload: await response.json() }))
        .then(({ response, payload }) => {
          if (!response.ok || !payload.data) return;
          const profileData = payload.data as OnboardingProfile;
          setProfile(profileData);
          setCv((current) => {
            const next = {
              ...current,
              contact: {
                ...current.contact,
                name: current.contact.name || profileData.full_name || "",
                email: current.contact.email || profileData.email || "",
                phone: current.contact.phone || profileData.phone || "",
                location: current.contact.location || profileData.country_current || "",
                linkedin: current.contact.linkedin || profileData.linkedin_url || "",
              },
            };
            localStorage.setItem(key, JSON.stringify(next));
            return next;
          });
        });
      const job = jobId
        ? loadJobWorkflow(userId).jobs.find((item) => item.id === jobId)
        : undefined;
      if (!job) return;
      setJobDescription(job.description);
      const marker = `autotime-cv-tailored:${userId}:${job.id}:${job.updatedAt}`;
      if (!saved.contact?.name || sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "started");
      setStatus("Tailoring CV for the selected tracked job…");
      void fetch("/api/ai/tailor-cv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cv: saved, jobDescription: job.description }),
      })
        .then(async (response) => ({
          response,
          payload: await response.json(),
        }))
        .then(({ response, payload }) => {
          if (!response.ok) {
            sessionStorage.removeItem(marker);
            setStatus(payload.error || "Automatic tailoring failed.");
            return;
          }
          setCv(payload.data.cv);
          localStorage.setItem(key, JSON.stringify(payload.data.cv));
          setStatus("Tracked-job tailored draft ready. Review every claim.");
        });
    } catch {
      setCv(empty);
    }
  }, [jobId, key, userId]);
  const save = (next: CVData) => {
    setCv(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  const list = (value: string) =>
    value
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);
  const content = (
    <>
      <ProductPageHeader
        eyebrow="ATS-safe CV"
        title="Your canonical CV"
        description="Keep your ATS-safe CV with your profile, then tailor it for a specific tracked job when needed."
      />
      {profile ? (
        <section className="workflow-section cv-profile-details" aria-labelledby="cv-profile-details-title">
          <div className="cv-profile-details-heading">
            <div>
              <p className="eyebrow">From your profile</p>
              <h2 id="cv-profile-details-title">Your saved details</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => router.push("/dashboard/profile")}>View profile</button>
          </div>
          <dl className="cv-profile-details-grid">
            <div><dt>Name</dt><dd>{profile.full_name || "Not recorded"}</dd></div>
            <div><dt>Contact</dt><dd>{[profile.email, profile.phone].filter(Boolean).join(" · ") || "Not recorded"}</dd></div>
            <div><dt>Current location</dt><dd>{profile.country_current || "Not recorded"}</dd></div>
            <div><dt>Target countries</dt><dd>{profile.countries_target?.join(", ") || "Not recorded"}</dd></div>
            <div className="cv-profile-details-wide"><dt>Work authorisation</dt><dd>{profile.work_right_details || "Not recorded"}</dd></div>
            <div className="cv-profile-details-wide"><dt>Professional links</dt><dd>{[profile.linkedin_url, profile.github_url, profile.portfolio_url].filter(Boolean).join(" · ") || "None added"}</dd></div>
          </dl>
          <p className="cv-profile-details-note">Blank CV contact fields are filled from these saved details. You can still tailor the CV fields below.</p>
        </section>
      ) : null}
      <CVEnrichmentPanel cv={cv} onApply={save} />
      <div className="phase-three-detail-grid cv-workspace-grid">
        <section className="workflow-editor cv-editor">
          <h2>CV details</h2>
          <div className="cv-contact-grid">
          {([
            ["name", "Name", "text", "name"],
            ["email", "Email", "email", "email"],
            ["phone", "Phone", "tel", "tel"],
            ["location", "Location", "text", "address-level2"],
            ["linkedin", "LinkedIn URL", "url", "url"],
          ] as const).map(([field, label, type, autoComplete]) => (
              <label key={field}>
                {label}
                <input
                  type={type}
                  autoComplete={autoComplete}
                  value={cv.contact[field] ?? ""}
                  onChange={(e) =>
                    save({
                      ...cv,
                      contact: { ...cv.contact, [field]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="cv-long-field">
            Summary
            <textarea
              rows={6}
              value={cv.summary}
              onChange={(e) => save({ ...cv, summary: e.target.value })}
            />
          </label>
          <label className="cv-long-field">
            Skills (one per line)
            <textarea
              value={cv.skills.join("\n")}
              onChange={(e) => save({ ...cv, skills: list(e.target.value) })}
            />
          </label>
          <label className="cv-long-field">
            Experience JSON
            <span className="cv-field-hint">Use a JSON list of roles with title, company, dates and bullets.</span>
            <textarea
              rows={10}
              value={JSON.stringify(cv.experience, null, 2)}
              onChange={(e) => {
                try {
                  save({ ...cv, experience: JSON.parse(e.target.value) });
                  setStatus("");
                } catch {
                  setStatus("Experience JSON is not valid yet.");
                }
              }}
            />
          </label>
          <label className="cv-long-field">
            Education JSON
            <span className="cv-field-hint">Use a JSON list with degree, institution and dates.</span>
            <textarea
              rows={7}
              value={JSON.stringify(cv.education, null, 2)}
              onChange={(e) => {
                try {
                  save({ ...cv, education: JSON.parse(e.target.value) });
                  setStatus("");
                } catch {
                  setStatus("Education JSON is not valid yet.");
                }
              }}
            />
          </label>
          <label className="cv-long-field">
            Tracked job description
            <textarea
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </label>
          <div className="workflow-actions">
            {returnTo ? <button type="button" className="secondary-button" disabled={!hasCvContent} onClick={() => router.push(returnTo)}>Use this CV and return</button> : null}
            <button
              type="button"
              className="button-primary"
              onClick={async () => {
                setStatus("Tailoring CV…");
                const response = await fetch("/api/ai/tailor-cv", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ cv, jobDescription }),
                });
                const payload = await response.json();
                if (!response.ok)
                  return setStatus(payload.error || "Tailoring failed");
                save(payload.data.cv);
                setStatus("Tailored draft ready. Review every claim.");
              }}
            >
              Tailor with AI
            </button>
            <button type="button" className="secondary-button" onClick={() => window.print()}>
              Export text-based PDF
            </button>
          </div>
          <p role="status">{status}</p>
        </section>
        <section className="cv-preview-panel" aria-label="CV preview">
          <CVRenderer cv={cv} />
        </section>
      </div>
    </>
  );
  return embedded ? (
    <section className="workflow-page" aria-label="Profile CV workspace">
      {content}
    </section>
  ) : (
    <main className="workflow-page">{content}</main>
  );
}
