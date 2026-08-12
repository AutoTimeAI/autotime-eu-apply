"use client";
import { useEffect, useState } from "react";
import { ProductEmptyState, ProductPageHeader, ProductStatusBadge } from "./product-ui";
import { OutreachDraftForm, type OutreachJob, type OutreachMessage } from "./outreach/OutreachDraftForm";

export default function OutreachWorkspace() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [jobs, setJobs] = useState<OutreachJob[]>([]);
  const [status, setStatus] = useState("");
  const load = async () => { const response = await fetch("/api/outreach"); const payload = await response.json(); if (response.ok) { setMessages(payload.data.messages ?? []); setJobs(payload.data.jobs ?? []); } else setStatus(payload.error); };
  useEffect(() => { void load(); }, []);
  const update = async (id: string, changes: object) => { const response = await fetch("/api/outreach", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, ...changes }) }); const payload = await response.json(); if (!response.ok) { setStatus(payload.error); return; } setMessages((all) => all.map((item) => item.id === id ? payload.data : item)); };
  return <main className="workflow-page"><ProductPageHeader eyebrow="Human-sent outreach" title="Draft and track recruiter outreach" description="Enter contact details manually or from an approved lookup. AutoTime drafts only—it never sends or automates LinkedIn." />
    <OutreachDraftForm jobs={jobs} onCreated={(message) => setMessages((all) => [message, ...all])} />
    <p role="status">{status}</p>
    {messages.length ? <section className="workflow-list">{messages.map((item) => <article className="workflow-list-row" key={item.id}><div><ProductStatusBadge status={item.status === "sent" ? "confirmed" : "inferred"}>{item.status}</ProductStatusBadge><h2>{item.recruiter_name || "Contact"}</h2><p>{item.contact_type.replaceAll("_", " ")}</p><input value={item.draft_subject ?? ""} placeholder="No subject for connection notes" onChange={(event) => setMessages((all) => all.map((message) => message.id === item.id ? { ...message, draft_subject: event.target.value } : message))} /><textarea value={item.draft_body} onChange={(event) => setMessages((all) => all.map((message) => message.id === item.id ? { ...message, draft_body: event.target.value } : message))} /></div><div className="workflow-actions"><button className="button-secondary" onClick={() => update(item.id, { draftSubject: item.draft_subject, draftBody: item.draft_body })}>Save edits</button><button className="button-primary" onClick={async () => { await navigator.clipboard.writeText([item.draft_subject, item.draft_body].filter(Boolean).join("\n\n")); await update(item.id, { status: "sent", followUpDue: new Date(Date.now()+7*86400000).toISOString() }); setStatus("Copied and marked sent. Follow-up set for 7 days."); }}>Copy and mark sent</button><select aria-label="Outreach status" value={item.status} onChange={(event) => void update(item.id, { status: event.target.value })}><option value="drafted">Drafted</option><option value="sent">Sent</option><option value="replied">Replied</option><option value="no_response">No response</option></select><input aria-label="Follow-up due" type="datetime-local" value={item.follow_up_due?.slice(0,16) ?? ""} onChange={(event) => void update(item.id, { followUpDue: event.target.value ? new Date(event.target.value).toISOString() : null })} /></div></article>)}</section> : <ProductEmptyState title="No outreach drafts" description="Create a human-reviewed draft for a tracked application." />}
  </main>;
}
