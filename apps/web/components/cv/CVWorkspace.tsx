"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ProductPageHeader } from "../product-ui";
import { CVRenderer } from "./CVRenderer";
import type { CVData } from "../../lib/cv/types";
import { useDashboardPlan } from "../UserNav";
import { loadJobWorkflow } from "../../lib/job-workflow-storage";
const empty: CVData = { contact: { name: "", email: "", phone: "", location: "" }, summary: "", experience: [], education: [], skills: [] };
export default function CVWorkspace() {
  const { userId } = useDashboardPlan(); const key = `autotime-cv-data:${userId}`;
  const searchParams = useSearchParams(); const jobId = searchParams.get("job_id");
  const [cv, setCv] = useState(empty); const [jobDescription, setJobDescription] = useState(""); const [status, setStatus] = useState("");
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(key) || "null") || empty; setCv(saved); const job = jobId ? loadJobWorkflow(userId).jobs.find((item) => item.id === jobId) : undefined; if (!job) return; setJobDescription(job.description); const marker = `autotime-cv-tailored:${userId}:${job.id}:${job.updatedAt}`; if (!saved.contact?.name || sessionStorage.getItem(marker)) return; sessionStorage.setItem(marker, "started"); setStatus("Tailoring CV for the selected tracked job…"); void fetch("/api/ai/tailor-cv", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cv: saved, jobDescription: job.description }) }).then(async (response) => ({ response, payload: await response.json() })).then(({ response, payload }) => { if (!response.ok) { sessionStorage.removeItem(marker); setStatus(payload.error || "Automatic tailoring failed."); return; } setCv(payload.data.cv); localStorage.setItem(key, JSON.stringify(payload.data.cv)); setStatus("Tracked-job tailored draft ready. Review every claim."); }); } catch { setCv(empty); } }, [jobId, key, userId]);
  const save = (next: CVData) => { setCv(next); localStorage.setItem(key, JSON.stringify(next)); };
  const list = (value: string) => value.split("\n").map((v) => v.trim()).filter(Boolean);
  return <main className="workflow-page"><ProductPageHeader eyebrow="ATS-safe CV" title="Tailor one canonical CV" description="Single-column, standard headings and text-only content for reliable ATS parsing." />
    <div className="phase-three-detail-grid"><section className="workflow-editor"><h2>CV details</h2>
      {(["name","email","phone","location","linkedin"] as const).map((field) => <label key={field}>{field[0].toUpperCase()+field.slice(1)}<input value={cv.contact[field] ?? ""} onChange={(e) => save({ ...cv, contact: { ...cv.contact, [field]: e.target.value } })} /></label>)}
      <label>Summary<textarea value={cv.summary} onChange={(e) => save({ ...cv, summary: e.target.value })} /></label>
      <label>Skills (one per line)<textarea value={cv.skills.join("\n")} onChange={(e) => save({ ...cv, skills: list(e.target.value) })} /></label>
      <label>Experience JSON<textarea rows={10} value={JSON.stringify(cv.experience, null, 2)} onChange={(e) => { try { save({ ...cv, experience: JSON.parse(e.target.value) }); setStatus(""); } catch { setStatus("Experience JSON is not valid yet."); } }} /></label>
      <label>Education JSON<textarea rows={7} value={JSON.stringify(cv.education, null, 2)} onChange={(e) => { try { save({ ...cv, education: JSON.parse(e.target.value) }); setStatus(""); } catch { setStatus("Education JSON is not valid yet."); } }} /></label>
      <label>Tracked job description<textarea rows={10} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} /></label>
      <div className="workflow-actions"><button className="button-primary" onClick={async () => { setStatus("Tailoring CV…"); const response = await fetch("/api/ai/tailor-cv", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cv, jobDescription }) }); const payload = await response.json(); if (!response.ok) return setStatus(payload.error || "Tailoring failed"); save(payload.data.cv); setStatus("Tailored draft ready. Review every claim."); }}>Tailor with AI</button>
      <button className="button-secondary" onClick={() => window.print()}>Export text-based PDF</button></div><p role="status">{status}</p>
    </section><section><CVRenderer cv={cv} /></section></div>
  </main>;
}
