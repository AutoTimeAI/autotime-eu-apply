"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductPageHeader } from "../product-ui";
import { CVRenderer } from "./CVRenderer";
import { CVEnrichmentPanel } from "./CVEnrichmentPanel";
import type { CVData } from "../../lib/cv/types";
import { useDashboardPlan } from "../UserNav";
import { loadJobWorkflow } from "../../lib/job-workflow-storage";
import { downloadCvDocx } from "../../lib/cv/export-docx";
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
  const missingRequiredFields = [
    !cv.contact.name.trim() && "name",
    !cv.contact.email.trim() && "email",
    !cv.contact.phone.trim() && "phone",
    !cv.contact.location.trim() && "location",
    !cv.summary.trim() && "summary",
    !cv.skills.some((skill) => skill.trim()) && "at least one skill",
    (!cv.experience.length || cv.experience.some((item) => !item.title.trim() || !item.company.trim() || !item.dates.trim() || !item.bullets.some((bullet) => bullet.trim()))) && "a complete experience entry",
    (!cv.education.length || cv.education.some((item) => !item.degree.trim() || !item.institution.trim() || !item.dates.trim())) && "a complete education entry",
  ].filter((item): item is string => Boolean(item));
  const isCvComplete = missingRequiredFields.length === 0;
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
            ["linkedin", "LinkedIn URL (optional)", "url", "url"],
          ] as const).map(([field, label, type, autoComplete]) => (
              <label key={field}>
                {label}
                <input
                  type={type}
                  autoComplete={autoComplete}
                  required={field !== "linkedin"}
                  aria-required={field !== "linkedin"}
                  aria-invalid={field !== "linkedin" && !cv.contact[field]?.trim()}
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
            <span className="cv-field-hint">Required. Add a concise professional summary.</span>
            <textarea
              rows={6}
              required
              aria-required="true"
              aria-invalid={!cv.summary.trim()}
              value={cv.summary}
              onChange={(e) => save({ ...cv, summary: e.target.value })}
            />
          </label>
          <label className="cv-long-field">
            Skills
            <span className="cv-field-hint">Required. Add at least one relevant skill per line.</span>
            <textarea
              rows={5}
              required
              aria-required="true"
              aria-invalid={!cv.skills.some((skill) => skill.trim())}
              placeholder={"Project management\nData analysis\nStakeholder communication"}
              value={cv.skills.join("\n")}
              onChange={(e) => save({ ...cv, skills: list(e.target.value) })}
            />
          </label>
          <section className="cv-builder-section" aria-labelledby="cv-experience-title">
            <div className="cv-builder-section-heading"><div><h3 id="cv-experience-title">Experience</h3><p>Required. Add your latest role, dates and at least one achievement.</p></div><button type="button" className="secondary-button" onClick={() => save({...cv,experience:[...cv.experience,{title:"",company:"",dates:"",bullets:[]}]})}>Add experience</button></div>
            {cv.experience.length ? cv.experience.map((item,index)=><article className="cv-entry-card" key={`experience-${index}`}><div className="cv-entry-grid"><label>Job title<input value={item.title} onChange={e=>save({...cv,experience:cv.experience.map((entry,i)=>i===index?{...entry,title:e.target.value}:entry)})}/></label><label>Company<input value={item.company} onChange={e=>save({...cv,experience:cv.experience.map((entry,i)=>i===index?{...entry,company:e.target.value}:entry)})}/></label><label className="cv-entry-wide">Dates<input placeholder="Example: Jan 2023 – Present" value={item.dates} onChange={e=>save({...cv,experience:cv.experience.map((entry,i)=>i===index?{...entry,dates:e.target.value}:entry)})}/></label><label className="cv-entry-wide">Achievements<span className="cv-field-hint">One achievement per line. Start with an action and include evidence where possible.</span><textarea rows={5} value={item.bullets.join("\n")} onChange={e=>save({...cv,experience:cv.experience.map((entry,i)=>i===index?{...entry,bullets:list(e.target.value)}:entry)})}/></label></div><button type="button" className="cv-remove-entry" onClick={()=>save({...cv,experience:cv.experience.filter((_,i)=>i!==index)})}>Remove experience</button></article>):<p className="cv-builder-empty">No experience added yet.</p>}
          </section>
          <section className="cv-builder-section" aria-labelledby="cv-education-title">
            <div className="cv-builder-section-heading"><div><h3 id="cv-education-title">Education</h3><p>Required. Add each qualification, institution and date range.</p></div><button type="button" className="secondary-button" onClick={() => save({...cv,education:[...cv.education,{degree:"",institution:"",dates:""}]})}>Add education</button></div>
            {cv.education.length ? cv.education.map((item,index)=><article className="cv-entry-card" key={`education-${index}`}><div className="cv-entry-grid"><label>Degree or qualification<input value={item.degree} onChange={e=>save({...cv,education:cv.education.map((entry,i)=>i===index?{...entry,degree:e.target.value}:entry)})}/></label><label>Institution<input value={item.institution} onChange={e=>save({...cv,education:cv.education.map((entry,i)=>i===index?{...entry,institution:e.target.value}:entry)})}/></label><label className="cv-entry-wide">Dates<input placeholder="Example: 2019 – 2022" value={item.dates} onChange={e=>save({...cv,education:cv.education.map((entry,i)=>i===index?{...entry,dates:e.target.value}:entry)})}/></label></div><button type="button" className="cv-remove-entry" onClick={()=>save({...cv,education:cv.education.filter((_,i)=>i!==index)})}>Remove education</button></article>):<p className="cv-builder-empty">No education added yet.</p>}
          </section>
          <section className="cv-tailor-card">
            <div><p className="eyebrow">Optional</p><h3>Tailor for a job</h3><p>Paste a vacancy description only when you want a job-specific draft. Your canonical CV remains the source.</p></div>
            <label>
            Job description
            <textarea
              rows={8}
              placeholder="Paste the full job description here…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
            </label>
            <button
              type="button"
              className="button-primary"
              disabled={!jobDescription.trim() || !isCvComplete}
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
              Create tailored draft
            </button>
          </section>
          {!isCvComplete ? <p className="onboarding-validation-alert" role="alert"><strong>Complete the required CV fields:</strong> {missingRequiredFields.join(", ")}.</p> : null}
          <div className="cv-document-actions"><div><h3>Ready to use your CV?</h3><p>Complete every required field and review the preview, then save it or download an ATS-friendly PDF or editable DOCX.</p></div><div className="workflow-actions">{returnTo ? <button type="button" className="button-primary" disabled={!isCvComplete} onClick={() => router.push(returnTo)}>Save CV and return</button> : null}<button type="button" className="secondary-button" disabled={!isCvComplete} onClick={() => window.print()}>Download PDF</button><button type="button" className="secondary-button" disabled={!isCvComplete} onClick={() => void downloadCvDocx(cv).catch(() => setStatus("Could not create the DOCX. Please try again."))}>Download DOCX</button></div></div>
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
