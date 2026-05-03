"use client"

import { useEffect, useMemo, useState } from "react"

type AlignmentStatus = "Strong" | "Partial" | "Gap"

type RequirementMatch = {
  requirement: string
  evidence: string
  status: AlignmentStatus
}

type AlignmentSnapshot = {
  id: string
  roleTitle: string
  company: string
  createdAt: string
  score: number
}

const sampleCv = [
  "Business analyst with payments, application support, UAT and stakeholder management experience.",
  "Delivered requirements analysis, process mapping, dashboard reporting and cross-functional delivery support.",
  "Worked with SQL, APIs, incident investigation, operational problem solving and regulated systems documentation."
].join("\n")

const sampleJob = [
  "We are hiring a Business Systems Analyst to support payments platform delivery.",
  "The role requires requirements gathering, stakeholder management, UAT coordination, SQL reporting and API integration awareness.",
  "Experience in financial services, application support and Agile delivery is desirable."
].join("\n")

const requirementSignals = [
  ["Requirements analysis", ["requirements", "requirement gathering", "requirements gathering", "business analysis"]],
  ["Stakeholder management", ["stakeholder", "stakeholders", "cross-functional"]],
  ["UAT", ["uat", "user acceptance testing", "testing"]],
  ["Payments", ["payment", "payments"]],
  ["Financial services", ["financial services", "fintech", "bank", "regulated"]],
  ["Application support", ["application support", "support analyst", "incident"]],
  ["SQL", ["sql"]],
  ["Reporting", ["reporting", "dashboard", "metrics"]],
  ["API integration", ["api", "apis", "integration"]],
  ["Agile delivery", ["agile", "scrum", "kanban", "delivery"]]
] as const

function includesAny(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(term))
}

function splitEvidence(text: string) {
  return text
    .split(/[\n.]+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function getRoleLabel(roleTitle: string) {
  return roleTitle.trim() || "target role"
}

function getRequirementMatches(cvText: string, jobText: string) {
  const cv = cvText.toLowerCase()
  const job = jobText.toLowerCase()
  const evidenceLines = splitEvidence(cvText)

  return requirementSignals
    .filter(([, terms]) => includesAny(job, terms))
    .map(([requirement, terms]): RequirementMatch => {
      const evidence =
        evidenceLines.find((line) => includesAny(line.toLowerCase(), terms)) ??
        ""

      if (evidence && includesAny(cv, terms)) {
        return {
          requirement,
          evidence,
          status: "Strong"
        }
      }

      const relatedEvidence = evidenceLines.find((line) =>
        includesAny(line.toLowerCase(), [
          "analysis",
          "delivery",
          "support",
          "systems",
          "stakeholder"
        ])
      )

      return {
        requirement,
        evidence: relatedEvidence || "No direct CV evidence found yet.",
        status: relatedEvidence ? "Partial" : "Gap"
      }
    })
}

function getAlignmentScore(matches: RequirementMatch[]) {
  if (matches.length === 0) {
    return 0
  }

  const points = matches.reduce((score, match) => {
    if (match.status === "Strong") {
      return score + 2
    }

    if (match.status === "Partial") {
      return score + 1
    }

    return score
  }, 0)

  return Math.round((points / (matches.length * 2)) * 100)
}

function getTailoredBullets(matches: RequirementMatch[], roleTitle: string) {
  const role = getRoleLabel(roleTitle)

  return matches
    .filter((match) => match.status !== "Gap")
    .slice(0, 6)
    .map(
      (match) =>
        `Aligned ${match.requirement.toLowerCase()} experience to the ${role}, using evidence from: ${match.evidence}`
    )
}

function getGapNotes(matches: RequirementMatch[]) {
  return matches
    .filter((match) => match.status === "Gap")
    .map(
      (match) =>
        `${match.requirement}: add truthful evidence only if it exists, otherwise avoid overstating this area.`
    )
}

function loadSnapshots() {
  if (typeof window === "undefined") {
    return []
  }

  try {
    return JSON.parse(
      window.localStorage.getItem("autotime-dashboard-alignments") ?? "[]"
    ) as AlignmentSnapshot[]
  } catch {
    return []
  }
}

export default function HomePage() {
  const [roleTitle, setRoleTitle] = useState("Business Systems Analyst")
  const [company, setCompany] = useState("Example FinTech")
  const [cvText, setCvText] = useState(sampleCv)
  const [jobText, setJobText] = useState(sampleJob)
  const [snapshots, setSnapshots] = useState<AlignmentSnapshot[]>([])
  const matches = useMemo(
    () => getRequirementMatches(cvText, jobText),
    [cvText, jobText]
  )
  const score = useMemo(() => getAlignmentScore(matches), [matches])
  const bullets = useMemo(
    () => getTailoredBullets(matches, roleTitle),
    [matches, roleTitle]
  )
  const gaps = useMemo(() => getGapNotes(matches), [matches])
  const strongCount = matches.filter((match) => match.status === "Strong").length
  const partialCount = matches.filter(
    (match) => match.status === "Partial"
  ).length
  const gapCount = matches.filter((match) => match.status === "Gap").length

  useEffect(() => {
    setSnapshots(loadSnapshots())
  }, [])

  const saveSnapshot = () => {
    const snapshot: AlignmentSnapshot = {
      id: crypto.randomUUID(),
      roleTitle,
      company,
      createdAt: new Date().toISOString(),
      score
    }
    const updated = [snapshot, ...snapshots].slice(0, 8)
    setSnapshots(updated)
    window.localStorage.setItem(
      "autotime-dashboard-alignments",
      JSON.stringify(updated)
    )
  }

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AutoTime EU Apply VNext</p>
          <h1>CV-JD Alignment Dashboard</h1>
        </div>
        <div className="score-panel" aria-label="Alignment score">
          <span>{score}%</span>
          <small>alignment</small>
        </div>
      </header>

      <section className="metrics-strip" aria-label="Alignment metrics">
        <div>
          <span>{matches.length}</span>
          <small>requirements</small>
        </div>
        <div>
          <span>{strongCount}</span>
          <small>strong</small>
        </div>
        <div>
          <span>{partialCount}</span>
          <small>partial</small>
        </div>
        <div>
          <span>{gapCount}</span>
          <small>gaps</small>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="input-column">
          <label>
            Role title
            <input
              value={roleTitle}
              onChange={(event) => setRoleTitle(event.target.value)}
            />
          </label>

          <label>
            Company
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>

          <label>
            Base CV / resume evidence
            <textarea
              value={cvText}
              onChange={(event) => setCvText(event.target.value)}
            />
          </label>

          <label>
            Job description
            <textarea
              value={jobText}
              onChange={(event) => setJobText(event.target.value)}
            />
          </label>

          <button type="button" onClick={saveSnapshot}>
            Save alignment snapshot
          </button>
        </div>

        <div className="output-column">
          <section className="panel">
            <h2>Requirement Match</h2>
            <div className="match-list">
              {matches.length === 0 ? (
                <p className="empty-state">
                  Paste a job description with role requirements to analyse.
                </p>
              ) : (
                matches.map((match) => (
                  <article className="match-item" key={match.requirement}>
                    <div>
                      <h3>{match.requirement}</h3>
                      <p>{match.evidence}</p>
                    </div>
                    <span className={`status-pill ${match.status.toLowerCase()}`}>
                      {match.status}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <h2>Tailored CV Bullets</h2>
            {bullets.length ? (
              <ul className="bullets-list">
                {bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Add stronger CV evidence to generate tailored bullet ideas.
              </p>
            )}
          </section>

          <section className="panel">
            <h2>Gap Notes</h2>
            {gaps.length ? (
              <ul className="bullets-list">
                {gaps.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                No hard gaps detected from the current requirement signals.
              </p>
            )}
          </section>
        </div>
      </section>

      <section className="snapshot-section">
        <div>
          <h2>Recent Alignment Snapshots</h2>
          <p>
            Local dashboard memory for comparing roles before this moves into
            shared account sync.
          </p>
        </div>
        <div className="snapshot-grid">
          {snapshots.length ? (
            snapshots.map((snapshot) => (
              <article className="snapshot-card" key={snapshot.id}>
                <strong>{snapshot.roleTitle || "Untitled role"}</strong>
                <span>{snapshot.company || "Unknown company"}</span>
                <small>
                  {new Date(snapshot.createdAt).toLocaleString()} ·{" "}
                  {snapshot.score}% aligned
                </small>
              </article>
            ))
          ) : (
            <p className="empty-state">No saved dashboard snapshots yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
