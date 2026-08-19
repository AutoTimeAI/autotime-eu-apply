"use client";

import { useState, type FormEvent } from "react";
import { PLATFORM_NAMES } from "shared";

export function CompatibilityReportForm() {
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setStatus("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/compatibility/reports", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        platform: form.get("platform"), siteUrl: form.get("siteUrl"),
        problemCategory: form.get("problemCategory"), description: form.get("description"),
        extensionVersion: form.get("extensionVersion"), diagnosticConsent: form.get("diagnosticConsent") === "on",
        company: form.get("company"),
      }),
    });
    const payload = await response.json();
    setSending(false);
    setStatus(response.ok ? "Thank you. The compatibility report has been queued for review." : payload.error ?? "Unable to submit the report.");
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <form className="compatibility-report" onSubmit={submit}>
      <div className="compatibility-form-grid">
        <label>Platform<select name="platform" required>{PLATFORM_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label>Public job or application URL<input name="siteUrl" type="url" required maxLength={2000} placeholder="https://…" /></label>
        <label>Problem<select name="problemCategory" required><option value="not_detected">Site not detected</option><option value="missing_details">Job details missing</option><option value="incorrect_details">Job details incorrect</option><option value="autofill_problem">Autofill problem</option><option value="other">Other</option></select></label>
        <label>Extension version (optional)<input name="extensionVersion" maxLength={40} placeholder="0.0.4" /></label>
      </div>
      <label>What happened? (optional)<textarea name="description" maxLength={2000} rows={4} /></label>
      <label className="compatibility-consent"><input name="diagnosticConsent" type="checkbox" /> Include browser user-agent information to help reproduce the problem.</label>
      <label className="compatibility-honeypot" aria-hidden="true">Company<input name="company" tabIndex={-1} autoComplete="off" /></label>
      <button className="button-primary" disabled={sending} type="submit">{sending ? "Sending…" : "Report an unsupported site"}</button>
      <p role="status" aria-live="polite">{status}</p>
    </form>
  );
}
