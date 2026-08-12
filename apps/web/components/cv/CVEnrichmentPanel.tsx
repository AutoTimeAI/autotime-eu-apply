"use client";

import { useState, type ChangeEvent } from "react";
import type { CVData, CVEnrichment } from "../../lib/cv/types";
import { enrichCvFromLinkedInZip } from "../../lib/cv/sources/linkedin-import";

export function mergeCvEnrichment(cv: CVData, enrichment: CVEnrichment): CVData {
  const skills = [...cv.skills];
  for (const skill of enrichment.skills ?? []) if (!skills.some((item) => item.toLowerCase() === skill.toLowerCase())) skills.push(skill);
  return {
    ...cv,
    summary: cv.summary.trim() || enrichment.summary || "",
    skills,
    experience: [...cv.experience, ...(enrichment.experience ?? [])],
    education: [...cv.education, ...(enrichment.education ?? [])],
  };
}

export function CVEnrichmentPanel({ cv, onApply }: { cv: CVData; onApply: (cv: CVData) => void }) {
  const [github, setGithub] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [preview, setPreview] = useState<CVEnrichment | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const request = async (url: string, body: unknown) => {
    setBusy(true); setStatus("Preparing enrichment preview…");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Enrichment failed");
      setPreview(payload.data); setStatus("Preview ready. Nothing has been saved.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Enrichment failed"); }
    finally { setBusy(false); }
  };
  const importZip = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true); setStatus("Reading your LinkedIn export locally…");
    try { setPreview(await enrichCvFromLinkedInZip(file)); setStatus("Preview ready. The ZIP was processed in this browser and was not uploaded."); }
    catch (error) { setStatus(error instanceof Error ? error.message : "LinkedIn import failed"); }
    finally { setBusy(false); event.target.value = ""; }
  };
  const applyPreview = async () => {
    if (!preview) return;
    onApply(mergeCvEnrichment(cv, preview));
    const ids = (preview.escoSuggestions ?? []).map((item) => item.escoSkillId);
    setPreview(null);
    if (!ids.length) { setStatus("Enrichment applied to your CV. Review and edit it before use."); return; }
    try {
      const response = await fetch("/api/esco/import-evidence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ escoSkillIds: ids }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "ESCO evidence import failed");
      setStatus(`Enrichment applied. Added ${payload.data.inserted} inferred ESCO skill signal${payload.data.inserted === 1 ? "" : "s"}; existing evidence was preserved.`);
    } catch (error) { setStatus(`CV enrichment applied, but ESCO evidence was not saved: ${error instanceof Error ? error.message : "unknown error"}`); }
  };

  return (
    <section className="workflow-section" aria-labelledby="cv-enrichment-title">
      <p className="product-eyebrow">Optional enrichment</p>
      <h2 id="cv-enrichment-title">Bring in existing evidence</h2>
      <p>Each source creates a preview only. Review it before adding anything to your saved CV.</p>
      <details>
        <summary>Connect GitHub</summary>
        <label>GitHub username<input value={github} onChange={(event) => setGithub(event.target.value)} autoComplete="off" /></label>
        <label>Personal access token (optional, not saved)<input type="password" value={githubToken} onChange={(event) => setGithubToken(event.target.value)} autoComplete="off" /></label>
        <button type="button" className="button-secondary" disabled={busy || !github.trim()} onClick={() => request("/api/cv/github", { username: github, token: githubToken || undefined })}>Preview GitHub evidence</button>
      </details>
      <details>
        <summary>Import LinkedIn export</summary>
        <p>Select the ZIP from LinkedIn’s “Get a copy of your data”. It is parsed locally in your browser.</p>
        <label>LinkedIn export ZIP<input type="file" accept=".zip,application/zip" disabled={busy} onChange={importZip} /></label>
        <label>Or paste your LinkedIn About / Experience text<textarea rows={6} value={linkedinText} onChange={(event) => setLinkedinText(event.target.value)} /></label>
        <button type="button" className="button-secondary" disabled={busy || linkedinText.trim().length < 80} onClick={() => request("/api/ai/cv-enrich", { source: "linkedin_text", content: linkedinText })}>Preview pasted text</button>
      </details>
      <details>
        <summary>Add portfolio URL</summary>
        <label>Your public portfolio URL<input type="url" value={portfolioUrl} placeholder="https://your-site.example" onChange={(event) => setPortfolioUrl(event.target.value)} /></label>
        <button type="button" className="button-secondary" disabled={busy || !portfolioUrl.trim()} onClick={() => request("/api/ai/cv-enrich", { source: "portfolio", url: portfolioUrl })}>Preview portfolio evidence</button>
      </details>
      <p role="status">{status}</p>
      {preview ? (
        <div className="workflow-editor" aria-label="Enrichment preview">
          <h3>Review: {preview.sourceLabel}</h3>
          {preview.notes.map((note) => <p key={note}>{note}</p>)}
          <label>Suggested summary<textarea readOnly rows={4} value={preview.summary ?? ""} /></label>
          <label>Suggested skills<textarea readOnly rows={5} value={(preview.skills ?? []).join("\n")} /></label>
          <label>Suggested experience<textarea readOnly rows={8} value={JSON.stringify(preview.experience ?? [], null, 2)} /></label>
          <label>Suggested education<textarea readOnly rows={5} value={JSON.stringify(preview.education ?? [], null, 2)} /></label>
          {(preview.escoSuggestions ?? []).length ? <div><h4>Suggested ESCO evidence</h4><p>Applying this preview adds these as low-confidence inferred signals; it never replaces existing evidence.</p><ul>{preview.escoSuggestions?.map((item) => <li key={item.escoSkillId}><strong>{item.sourceSkill}</strong> → {item.preferredLabel}</li>)}</ul></div> : null}
          <div className="workflow-actions">
            <button type="button" className="button-primary" onClick={applyPreview}>Apply reviewed suggestions</button>
            <button type="button" className="button-secondary" onClick={() => { setPreview(null); setStatus("Preview discarded. Your CV was not changed."); }}>Discard</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
