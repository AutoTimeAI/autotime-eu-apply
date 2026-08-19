"use client";

import { useRef, useState } from "react";
import { parseContactCsv, type ParsedContactRow } from "../../lib/outreach/contact-import";

export type SavedOutreachContact = {
  id: string; name: string; role: string | null; company: string; email: string | null;
  profile_url: string | null; contact_type: "recruiter" | "hiring_manager" | "peer_target_role";
};

export function ContactCsvImport({ contacts, onImported, onSelect }: {
  contacts: SavedOutreachContact[];
  onImported: () => Promise<void>;
  onSelect: (contact: SavedOutreachContact) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedContactRow[]>([]);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState("");
  const validRows = rows.filter((row) => row.errors.length === 0);

  const readFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 250_000) { setStatus("CSV files must be 250 KB or smaller."); return; }
    const parsed = parseContactCsv(await file.text());
    setRows(parsed);
    setConsent(false);
    setStatus(parsed.length ? `${parsed.length} contacts ready to review.` : "The CSV needs a header and at least one contact row.");
  };

  const importContacts = async () => {
    setStatus("Importing contacts…");
    const response = await fetch("/api/outreach/contacts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ consent, contacts: validRows.map(({ row: _row, errors: _errors, ...contact }) => contact) }),
    });
    const payload = await response.json();
    if (!response.ok) { setStatus(payload.error); return; }
    await onImported();
    setRows([]);
    setConsent(false);
    if (inputRef.current) inputRef.current.value = "";
    setStatus(`Imported ${payload.data.imported}; skipped ${payload.data.duplicates} duplicate${payload.data.duplicates === 1 ? "" : "s"}.`);
  };

  return <section className="workflow-editor" aria-labelledby="contact-import-title">
    <h2 id="contact-import-title">Import outreach contacts</h2>
    <p>Upload contacts you are permitted to store. AutoTime does not discover, message, or sync contacts automatically.</p>
    <label>Contact CSV<input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(event) => void readFile(event.target.files?.[0])} /></label>
    <p className="form-help">Headers: name, company, email or profile URL; optional role and contact type. Maximum 100 contacts.</p>
    {rows.length ? <>
      <div className="table-scroll"><table><thead><tr><th>Row</th><th>Name</th><th>Company</th><th>Email/profile</th><th>Type</th><th>Review</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.row}><td>{row.row}</td><td>{row.name || "—"}</td><td>{row.company || "—"}</td><td>{row.email || row.profileUrl || "—"}</td><td>{row.contactType.replaceAll("_", " ")}</td><td>{row.errors.length ? row.errors.join("; ") : "Ready"}</td></tr>)}</tbody>
      </table></div>
      <label><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /> I confirm I am permitted to store these contacts for my personal job-search outreach.</label>
      <button type="button" className="button-primary" disabled={!consent || !validRows.length || validRows.length !== rows.length} onClick={() => void importContacts()}>Import {validRows.length} contacts</button>
    </> : null}
    <p role="status" aria-live="polite">{status}</p>
    {contacts.length ? <div><h3>Saved contacts</h3><ul className="workflow-list">{contacts.map((contact) => <li key={contact.id} className="workflow-list-row"><span><strong>{contact.name}</strong> · {contact.role || contact.contact_type.replaceAll("_", " ")} at {contact.company}</span><button type="button" className="button-secondary" onClick={() => onSelect(contact)}>Use in draft</button></li>)}</ul></div> : null}
  </section>;
}
