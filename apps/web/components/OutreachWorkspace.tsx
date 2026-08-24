"use client";

import { useCallback, useEffect, useState } from "react";
import { ProductEmptyState, ProductPageHeader, ProductStatusBadge } from "./product-ui";
import { OutreachDraftForm, type OutreachJob, type OutreachMessage } from "./outreach/OutreachDraftForm";
import { ContactCsvImport, type SavedOutreachContact } from "./outreach/ContactCsvImport";

export default function OutreachWorkspace() {
  const [messages, setMessages] = useState<OutreachMessage[]>([]);
  const [jobs, setJobs] = useState<OutreachJob[]>([]);
  const [contacts, setContacts] = useState<SavedOutreachContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<SavedOutreachContact | null>(null);
  const [status, setStatus] = useState("Loading outreach drafts…");

  const load = useCallback(async () => {
    const response = await fetch("/api/outreach");
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error);
      return;
    }
    setMessages(payload.data.messages ?? []);
    setJobs(payload.data.jobs ?? []);
    setStatus("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (id: string, changes: object) => {
    const response = await fetch("/api/outreach", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...changes }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setStatus(payload.error);
      return;
    }
    setMessages((all) => all.map((item) => (item.id === id ? payload.data : item)));
  };

  const loadContacts = useCallback(async () => {
    const response = await fetch("/api/outreach/contacts");
    const payload = await response.json();
    if (response.ok) setContacts(payload.data ?? []);
    else setStatus(payload.error);
  }, []);

  useEffect(() => { void loadContacts(); }, [loadContacts]);

  return (
    <main className="workflow-page">
      <ProductPageHeader
        eyebrow="Human-sent outreach"
        title="Draft and track recruiter outreach"
        description="Enter contact details manually or from an approved lookup. AutoTime drafts only—it never sends or automates LinkedIn."
      />
      <ContactCsvImport contacts={contacts} onImported={loadContacts} onSelect={setSelectedContact} />
      <OutreachDraftForm jobs={jobs} selectedContact={selectedContact} onCreated={(message) => setMessages((all) => [message, ...all])} />
      <p role="status" aria-live="polite">{status}</p>
      {messages.length ? (
        <section className="workflow-list" aria-label="Outreach drafts">
          {messages.map((item) => {
            const fieldId = `outreach-${item.id}`;
            const isLinkedInNote = item.channel === "linkedin_note";
            const characterCount = item.draft_body.length;
            const overLimit = isLinkedInNote && characterCount > 300;

            return (
              <article className="workflow-list-row" key={item.id}>
                <div>
                  <ProductStatusBadge status={item.status === "sent" ? "confirmed" : "inferred"}>{item.status}</ProductStatusBadge>
                  <h2>{item.recruiter_name || "Contact"}</h2>
                  <p>{item.contact_type.replaceAll("_", " ")}</p>
                  <label htmlFor={`${fieldId}-subject`}>Subject</label>
                  <input
                    id={`${fieldId}-subject`}
                    value={item.draft_subject ?? ""}
                    placeholder="No subject for connection notes"
                    onChange={(event) => setMessages((all) => all.map((message) => message.id === item.id ? { ...message, draft_subject: event.target.value } : message))}
                  />
                  <label htmlFor={`${fieldId}-body`}>Message draft</label>
                  <textarea
                    id={`${fieldId}-body`}
                    value={item.draft_body}
                    aria-describedby={isLinkedInNote ? `${fieldId}-count` : undefined}
                    onChange={(event) => setMessages((all) => all.map((message) => message.id === item.id ? { ...message, draft_body: event.target.value } : message))}
                  />
                  {isLinkedInNote ? (
                    <p id={`${fieldId}-count`} className="outreach-character-count" data-over-limit={overLimit} aria-live="polite">
                      {characterCount} of 300 characters{overLimit ? " — shorten before copying" : ""}
                    </p>
                  ) : null}
                </div>
                <div className="workflow-actions">
                  <button type="button" className="button-secondary" onClick={() => update(item.id, { draftSubject: item.draft_subject, draftBody: item.draft_body })}>
                    Save edits
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={overLimit}
                    onClick={async () => {
                      await navigator.clipboard.writeText([item.draft_subject, item.draft_body].filter(Boolean).join("\n\n"));
                      setStatus("Draft copied. AutoTime has not sent it; update the status after you send it yourself.");
                    }}
                  >
                    Copy draft
                  </button>
                  <label htmlFor={`${fieldId}-status`}>Message status</label>
                  <select id={`${fieldId}-status`} value={item.status} onChange={(event) => void update(item.id, { status: event.target.value })}>
                    <option value="drafted">Drafted</option>
                    <option value="sent">Sent</option>
                    <option value="replied">Replied</option>
                    <option value="no_response">No response</option>
                  </select>
                  <label htmlFor={`${fieldId}-follow-up`}>Follow-up due</label>
                  <input
                    id={`${fieldId}-follow-up`}
                    type="datetime-local"
                    value={item.follow_up_due?.slice(0, 16) ?? ""}
                    onChange={(event) => void update(item.id, { followUpDue: event.target.value ? new Date(event.target.value).toISOString() : null })}
                  />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <ProductEmptyState title="No outreach drafts" description="Create a human-reviewed draft for a tracked application." />
      )}
    </main>
  );
}
