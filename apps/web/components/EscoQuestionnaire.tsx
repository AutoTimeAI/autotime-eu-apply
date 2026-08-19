"use client";

import { useEffect, useState } from "react";
import { ProductEmptyState, ProductPageHeader, ProductStatusBadge } from "./product-ui";

type Skill = { esco_skill_id: string; preferred_label: string; confidence: number; source: "stated" | "inferred" | "confirmed" };
type Match = { job_id: string; title: string; company: string; location: string | null; matched_skills: number; total_essential_skills: number; matched_skill_labels: string[]; missing_skill_labels: string[]; overlap: number | null };

const firstQuestion = "What kind of work are you strongest at, and what have you actually done recently?";

export default function EscoQuestionnaire() {
  const [question, setQuestion] = useState(firstQuestion);
  const [answer, setAnswer] = useState("");
  const [round, setRound] = useState(1);
  const [complete, setComplete] = useState(false);
  const [profile, setProfile] = useState<Skill[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const loadMatches = async () => {
    const response = await fetch("/api/esco/matches");
    const payload = await response.json();
    if (response.ok) setMatches(payload.data ?? []);
    else setStatus(payload.error);
  };

  useEffect(() => {
    void fetch("/api/esco/questionnaire")
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok) return setStatus(payload.error);
        setProfile(payload.data.profile);
        setRound(payload.data.answers.length + 1);
        setQuestion(payload.data.nextQuestion || firstQuestion);
        setComplete(payload.data.complete);
        if (payload.data.profile.length) void loadMatches();
      });
  }, []);

  const submit = async () => {
    setBusy(true);
    setStatus("");
    try {
      const response = await fetch("/api/esco/questionnaire", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ question, answer }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setAnswer("");
      setRound(payload.data.round + 1);
      setQuestion(payload.data.nextQuestion);
      setComplete(payload.data.complete);
      setStatus(`Round ${payload.data.round} saved. ${payload.data.skills.length} ESCO skill mappings updated.`);
      const refreshed = await fetch("/api/esco/questionnaire");
      const current = await refreshed.json();
      if (refreshed.ok) setProfile(current.data.profile);
      await loadMatches();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Questionnaire failed.");
    } finally {
      setBusy(false);
    }
  };

  const confirmSkill = async (escoSkillId: string) => {
    const response = await fetch("/api/esco/questionnaire", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ escoSkillId, confirmed: true }) });
    if (response.ok) {
      setProfile((items) => items.map((item) => item.esco_skill_id === escoSkillId ? { ...item, source: "confirmed" } : item));
      await loadMatches();
    } else {
      const payload = await response.json();
      setStatus(payload.error);
    }
  };

  const displayedMatches = showAllMatches ? matches : matches.slice(0, 2);

  return <main className="workflow-page">
    <ProductPageHeader eyebrow="ESCO skills" title="Explainable role matching" description="Answer six evidence-focused questions. Matches use official ESCO skill relationships—not hiring predictions." />
    <a className="text-link" href="/dashboard/role-pathways">← Role Pathways</a>
    {!complete ? <section className="workflow-editor">
      <p className="product-eyebrow">Question {Math.min(round, 6)} of 6</p><h2>{question}</h2>
      <label>Your evidence<textarea rows={8} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Describe concrete work, tools, decisions and outcomes you can verify." /></label>
      <button className="button-primary" disabled={busy || answer.trim().length < 20} onClick={submit}>{busy ? "Mapping evidence…" : "Save answer and continue"}</button>
    </section> : <section className="workflow-section"><ProductStatusBadge status="confirmed">Questionnaire complete</ProductStatusBadge><h2>Your skill evidence is ready</h2><p>You can revisit Role Pathways while AutoTime uses confirmed and inferred ESCO mappings for transparent matching.</p></section>}
    <p role="status">{status}</p>
    <section className="workflow-section"><h2>Current ESCO skill profile</h2>{profile.length ? <ul>{profile.map((skill) => <li key={skill.esco_skill_id}><strong>{skill.preferred_label}</strong> — {Math.round(skill.confidence * 100)}% confidence · {skill.source} {skill.source !== "confirmed" ? <button className="button-secondary" onClick={() => confirmSkill(skill.esco_skill_id)}>Confirm</button> : null}</li>)}</ul> : <p>No mapped skills yet.</p>}</section>
    <section className="workflow-section"><h2>Matching aggregated jobs</h2>{matches.length ? <>
      <p>Showing the strongest {displayedMatches.length} of {matches.length} explained matches.</p>
      <div className="workflow-list">{displayedMatches.map((match) => <article className="workflow-list-row" key={match.job_id}><div><h3>{match.title}</h3><p>{match.company} · {match.location || "Location unavailable"}</p><strong>Matched {match.matched_skills} of {match.total_essential_skills} essential skills</strong><p>Matched: {match.matched_skill_labels.join(", ") || "None confirmed"}</p><p>Missing: {match.missing_skill_labels.join(", ") || "No essential gaps in loaded ESCO data"}</p></div><a className="button-secondary" href={`/dashboard/jobs/browse?job_id=${match.job_id}`}>View job</a></article>)}</div>
      {matches.length > 2 ? <button type="button" className="button-secondary" onClick={() => setShowAllMatches((current) => !current)}>{showAllMatches ? "Show top 2" : "Show all explained matches"}</button> : null}
    </> : <ProductEmptyState title="No classified job matches yet" description="Import ESCO reference data and classify aggregated jobs, then answer the questionnaire." />}</section>
  </main>;
}
