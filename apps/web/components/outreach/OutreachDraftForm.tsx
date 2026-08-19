"use client";

import { useEffect, useState } from "react";
import type { SavedOutreachContact } from "./ContactCsvImport";

export type OutreachMessage = { id: string; job_id: string; recruiter_name: string | null; recruiter_role: string | null; recruiter_email: string | null; contact_type: "recruiter"|"hiring_manager"|"peer_target_role"; channel: "linkedin_note"|"linkedin_inmail"|"email"; draft_subject: string|null; draft_body: string; status: "drafted"|"sent"|"replied"|"no_response"; follow_up_due: string|null };
export type OutreachJob = { id: string; title: string; company: string|null; role_title: string|null; notes: string|null; job_snapshot: unknown };

const initial = { jobId: "", jobTitle: "", companyName: "", jobDescription: "", recruiterName: "", recruiterRole: "Recruiter", recruiterEmail: "", candidateSummary: "", strengths: "", channel: "email", contactType: "recruiter" };

export function OutreachDraftForm({ jobs, initialJobId = "", selectedContact, onCreated }: { jobs: OutreachJob[]; initialJobId?: string; selectedContact?: SavedOutreachContact | null; onCreated: (message: OutreachMessage) => void }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState("");
  const selectJob = (jobId: string) => {
    const job = jobs.find((item) => item.id === jobId);
    setForm((current) => ({ ...current, jobId, jobTitle: job?.role_title || job?.title || "", companyName: job?.company || "", jobDescription: job?.notes || JSON.stringify(job?.job_snapshot ?? "") }));
  };
  useEffect(() => { if (initialJobId) selectJob(initialJobId); }, [initialJobId, jobs]);
  useEffect(() => {
    if (!selectedContact) return;
    setForm((current) => ({ ...current, recruiterName: selectedContact.name, recruiterRole: selectedContact.role || selectedContact.contact_type.replaceAll("_", " "), recruiterEmail: selectedContact.email || "", companyName: current.companyName || selectedContact.company, contactType: selectedContact.contact_type }));
  }, [selectedContact]);
  return <section className="workflow-editor"><h3>Draft outreach</h3><p>AutoTime drafts only. You review, copy, and send it yourself.</p><div className="workflow-form-grid">
    <label>Tracked application<select value={form.jobId} onChange={(event) => selectJob(event.target.value)}><option value="">Choose an application</option>{jobs.map((job) => <option key={job.id} value={job.id}>{job.role_title || job.title} — {job.company || "Unknown company"}</option>)}</select></label>
    {(["jobTitle","companyName","recruiterName","recruiterRole","recruiterEmail","candidateSummary"] as const).map((key) => <label key={key}>{key.replace(/([A-Z])/g," $1")}<input value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /></label>)}
    <label className="full-span">Job description<textarea value={form.jobDescription} onChange={(event) => setForm({ ...form, jobDescription: event.target.value })} /></label>
    <label>Strengths (comma separated)<input value={form.strengths} onChange={(event) => setForm({ ...form, strengths: event.target.value })} /></label>
    <label>Contact type<select value={form.contactType} onChange={(event) => setForm({ ...form, contactType: event.target.value })}><option value="recruiter">Recruiter</option><option value="hiring_manager">Hiring manager</option><option value="peer_target_role">Peer in target role</option></select></label>
    <label>Channel<select value={form.channel} onChange={(event) => setForm({ ...form, channel: event.target.value })}><option value="email">Email</option><option value="linkedin_note">LinkedIn note</option><option value="linkedin_inmail">LinkedIn InMail</option></select></label>
  </div>{form.contactType === "peer_target_role" ? <p>Peer outreach is informational only: ask about the role or team, never an application or referral.</p> : null}
  <button type="button" className="button-primary" onClick={async () => { setStatus("Drafting…"); const response = await fetch("/api/outreach", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, candidateKeyStrengths: form.strengths.split(",").map((item) => item.trim()).filter(Boolean) }) }); const payload = await response.json(); if (!response.ok) { setStatus(payload.error); return; } onCreated(payload.data); setStatus("Draft ready. Review before copying."); }}>Draft message</button><p role="status">{status}</p></section>;
}
