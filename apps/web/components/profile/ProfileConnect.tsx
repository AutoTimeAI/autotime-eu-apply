"use client";
import { useEffect, useMemo, useState } from "react";
import { ProductEmptyState, ProductStatusBadge } from "../product-ui";
import { OutreachDraftForm, type OutreachJob, type OutreachMessage } from "../outreach/OutreachDraftForm";

type Filter = "all" | OutreachMessage["status"];
export default function ProfileConnect() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [jobs, setJobs] = useState<OutreachJob[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [ascending, setAscending] = useState(true);
  const [draftJobId, setDraftJobId] = useState<string | null>(null);
  const [status, setStatus] = useState("Loading contacts…");
  useEffect(() => { void fetch("/api/outreach").then(async (response) => ({ response, payload: await response.json() })).then(({ response, payload }) => { if (!response.ok) { setStatus(payload.error); return; } setMessages(payload.data.messages ?? []); setJobs(payload.data.jobs ?? []); setStatus(""); }); }, []);
  const jobById = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);
  const visible = useMemo(() => messages.filter((message) => filter === "all" || message.status === filter).sort((a, b) => { const aTime = a.follow_up_due ? Date.parse(a.follow_up_due) : Number.MAX_SAFE_INTEGER; const bTime = b.follow_up_due ? Date.parse(b.follow_up_due) : Number.MAX_SAFE_INTEGER; return ascending ? aTime - bTime : bTime - aTime; }), [messages, filter, ascending]);
  return <section className="workflow-page" aria-labelledby="profile-connect-title"><p className="product-eyebrow">Connect</p><h2 id="profile-connect-title">Contacts and follow-ups</h2><p>Discover and draft across tracked applications. AutoTime never connects, sends messages, or scrapes LinkedIn.</p>
    <div className="workflow-filters"><label>Status<select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}><option value="all">All</option><option value="drafted">Drafted</option><option value="sent">Sent</option><option value="replied">Replied</option><option value="no_response">No response</option></select></label><button type="button" className="button-secondary" onClick={() => setAscending((value) => !value)}>Follow-up: {ascending ? "soonest first" : "latest first"}</button></div>
    <p role="status">{status}</p>
    {visible.length ? <div className="workflow-list">{visible.map((message) => { const job = jobById.get(message.job_id); return <article className="workflow-list-row" key={message.id}><div><ProductStatusBadge status={message.status === "replied" ? "confirmed" : "inferred"}>{message.status}</ProductStatusBadge><h3>{message.recruiter_name || "Contact"}</h3><p>{message.recruiter_role || "Role not recorded"} · {message.contact_type.replaceAll("_", " ")}</p><p><strong>{job?.role_title || job?.title || "Tracked role"}</strong> · {job?.company || "Company not recorded"}</p><p>Follow-up: {message.follow_up_due ? new Date(message.follow_up_due).toLocaleString() : "Not scheduled"}</p></div><button type="button" className="button-secondary" onClick={() => setDraftJobId(message.job_id)}>Draft message</button></article>; })}</div> : status ? null : <ProductEmptyState title="No matching contacts" description="Draft outreach for a tracked application to add it here." />}
    {draftJobId ? <div><div className="workflow-actions"><button type="button" className="button-secondary" onClick={() => setDraftJobId(null)}>Close drafting</button></div><OutreachDraftForm jobs={jobs} initialJobId={draftJobId} onCreated={(message) => { setMessages((items) => [message, ...items]); setDraftJobId(null); setStatus("Draft created. Review it in Outreach before copying or sending."); }} /></div> : null}
  </section>;
}
