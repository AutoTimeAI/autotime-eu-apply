"use client"

import { useEffect, useMemo, useState } from "react"
import {
  companionDashboardStateSchema,
  type ApplicationRecord,
  type ApplicationStatus,
  type CandidateProfile,
  type CompanionDashboardState,
  type JobAnalysisDraft,
  type ReusableAnswers
} from "shared"
import {
  canUseWebAI,
  createLocalInterviewPrepPack,
  defaultWebAISettings,
  generateAIInterviewPrepPack,
  getAIInterviewErrorMessage,
  type WebAISettings
} from "../lib/interview-prep"

type DashboardTab = "profile" | "jobs" | "applications" | "interview"

const storageKey = "autotime-v2-companion-dashboard"
const aiSettingsStorageKey = "autotime-v2-ai-settings"

const applicationStatuses: ApplicationStatus[] = [
  "Saved",
  "Applying",
  "Applied",
  "Interview",
  "Rejected",
  "Closed"
]

const emptyProfile: CandidateProfile = {
  fullName: "Rajan",
  email: "",
  phone: "",
  linkedInUrl: "",
  githubUrl: "",
  portfolioUrl: "",
  currentCountry: "United Kingdom",
  currentCity: "",
  targetCountries: "United Kingdom, Ireland, Netherlands, Germany",
  targetRoles: "Business Analyst, Systems Analyst, Application Support Analyst",
  workRightDetails: "",
  sponsorshipNeeded: false,
  relocationWillingness: "depends",
  salaryExpectation: "",
  noticePeriod: "Negotiable",
  baseCvText:
    "Business analyst with payments, application support, UAT, stakeholder management, SQL reporting and systems delivery experience.",
  projectSummaries:
    "AutoTime EU Apply: AI-assisted job application workflow. FinTech operations project: incident triage, resilience, SLA and stakeholder reporting.",
  experienceHighlights:
    "Requirements analysis, UAT coordination, stakeholder translation, operational problem solving and regulated systems documentation."
}

const emptyReusableAnswers: ReusableAnswers = {
  sponsorshipAnswer: "",
  relocationAnswer: "",
  workAuthorisationAnswer: "",
  noticePeriodAnswer: "My notice period is negotiable.",
  salaryExpectationAnswer: "",
  motivationAnswer:
    "I am interested in roles where I can combine business analysis, systems thinking and delivery clarity.",
  strengthsAnswer:
    "My strengths are requirements analysis, stakeholder management, UAT and operational problem solving.",
  availabilityAnswer: ""
}

const emptyJobAnalysis: JobAnalysisDraft = {
  jobTitle: "Business Systems Analyst",
  company: "Example FinTech",
  jobUrl: "https://example.com/jobs/business-systems-analyst",
  location: "London, United Kingdom",
  workMode: "hybrid",
  jobDescription:
    "Business systems analyst role supporting payments delivery, requirements gathering, stakeholder management, UAT coordination, SQL reporting and API integration.",
  notes: "V2 dashboard local companion sample.",
  skills: [
    "Requirements analysis",
    "Stakeholder management",
    "UAT",
    "Payments",
    "SQL"
  ],
  seniority: "Mid-level",
  summary:
    "Business Systems Analyst at Example FinTech appears to be a mid-level hybrid opportunity.",
  gaps: ["Confirm sponsorship and location practicality before applying."],
  fitScore: 82,
  recommendation: "High Priority",
  positioningAngle:
    "Position around FinTech systems, application support, and cross-functional delivery.",
  scoreFactors: [
    "Role title aligns with the target analyst/systems role family.",
    "Domain language supports a FinTech or regulated-systems positioning angle.",
    "Work mode supports practical UK/EU application execution."
  ]
}

const defaultState: CompanionDashboardState = {
  profile: emptyProfile,
  reusableAnswers: emptyReusableAnswers,
  jobAnalysis: emptyJobAnalysis,
  applications: [],
  interviewPrepPacks: []
}

function getStoredState() {
  if (typeof window === "undefined") {
    return defaultState
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "null")
    const result = companionDashboardStateSchema.safeParse(parsed)
    return result.success ? result.data : defaultState
  } catch {
    return defaultState
  }
}

function saveState(state: CompanionDashboardState) {
  window.localStorage.setItem(storageKey, JSON.stringify(state))
}

function getStoredAISettings() {
  if (typeof window === "undefined") {
    return defaultWebAISettings
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(aiSettingsStorageKey) ?? "null"
    ) as Partial<WebAISettings> | null

    return {
      ...defaultWebAISettings,
      ...(parsed ?? {}),
      monthlyBudgetUsd:
        typeof parsed?.monthlyBudgetUsd === "number"
          ? parsed.monthlyBudgetUsd
          : defaultWebAISettings.monthlyBudgetUsd,
      usedBudgetUsd:
        typeof parsed?.usedBudgetUsd === "number"
          ? parsed.usedBudgetUsd
          : defaultWebAISettings.usedBudgetUsd
    }
  } catch {
    return defaultWebAISettings
  }
}

function saveAISettings(settings: WebAISettings) {
  window.localStorage.setItem(aiSettingsStorageKey, JSON.stringify(settings))
}

function getWordSignals(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .match(/\b(requirements?|stakeholders?|uat|payments?|fintech|sql|api|agile|support|systems?|reporting|delivery|analysis)\b/g) ??
        []
    )
  )
}

function getFitScore(profile: CandidateProfile, job: JobAnalysisDraft) {
  const profileSignals = getWordSignals(
    [profile.baseCvText, profile.experienceHighlights, profile.projectSummaries]
      .join(" ")
      .toLowerCase()
  )
  const jobSignals = getWordSignals(
    [job.jobTitle, job.jobDescription, job.notes].join(" ").toLowerCase()
  )

  if (jobSignals.length === 0) {
    return job.fitScore ?? 0
  }

  const matched = jobSignals.filter((signal) => profileSignals.includes(signal))
  return Math.max(
    job.fitScore ?? 0,
    Math.round((matched.length / jobSignals.length) * 100)
  )
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return ""
  }
}

function createApplication(job: JobAnalysisDraft): ApplicationRecord {
  const title = job.jobTitle || "Untitled role"
  return {
    id: crypto.randomUUID(),
    title,
    roleTitle: title,
    company: job.company || undefined,
    url: job.jobUrl,
    source: getHostname(job.jobUrl),
    createdAt: new Date().toISOString(),
    status: "Saved",
    nextAction: "Tailor application",
    nextActionDate: "",
    notes: job.positioningAngle || job.notes
  }
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("profile")
  const [state, setState] = useState<CompanionDashboardState>(defaultState)
  const [importJson, setImportJson] = useState("")
  const [status, setStatus] = useState("")
  const [aiSettings, setAISettings] =
    useState<WebAISettings>(defaultWebAISettings)
  const fitScore = useMemo(
    () => getFitScore(state.profile, state.jobAnalysis),
    [state.profile, state.jobAnalysis]
  )
  const interviewApplications = state.applications.filter(
    (application) => application.status === "Interview"
  )

  useEffect(() => {
    setState(getStoredState())
    setAISettings(getStoredAISettings())
  }, [])

  const persist = (next: CompanionDashboardState, message: string) => {
    setState(next)
    saveState(next)
    setStatus(message)
    setTimeout(() => setStatus(""), 3000)
  }

  const updateProfile = <K extends keyof CandidateProfile>(
    key: K,
    value: CandidateProfile[K]
  ) => {
    setState((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value }
    }))
  }

  const updateJob = <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => {
    setState((current) => ({
      ...current,
      jobAnalysis: { ...current.jobAnalysis, [key]: value }
    }))
  }

  const updateAISetting = <K extends keyof WebAISettings>(
    key: K,
    value: WebAISettings[K]
  ) => {
    setAISettings((current) => ({ ...current, [key]: value }))
  }

  const saveDashboard = () => {
    persist(state, "Dashboard saved locally")
  }

  const saveApplicationFromJob = () => {
    if (!state.jobAnalysis.jobUrl.trim()) {
      setStatus("Add a job URL before saving an application")
      return
    }

    const application = createApplication({
      ...state.jobAnalysis,
      fitScore
    })
    persist(
      {
        ...state,
        applications: [application, ...state.applications]
      },
      "Application saved to dashboard"
    )
    setActiveTab("applications")
  }

  const updateApplication = (
    id: string,
    changes: Partial<ApplicationRecord>
  ) => {
    persist(
      {
        ...state,
        applications: state.applications.map((application) =>
          application.id === id
            ? { ...application, ...changes }
            : application
        )
      },
      "Application updated"
    )
  }

  const saveWebAISettings = () => {
    saveAISettings(aiSettings)
    setStatus("AI settings saved locally")
    setTimeout(() => setStatus(""), 3000)
  }

  const clearWebAISettings = () => {
    setAISettings(defaultWebAISettings)
    saveAISettings(defaultWebAISettings)
    setStatus("AI settings cleared")
    setTimeout(() => setStatus(""), 3000)
  }

  const saveInterviewPrepPack = (
    pack: CompanionDashboardState["interviewPrepPacks"][number],
    message: string,
    nextAISettings = aiSettings
  ) => {
    persist(
      {
        ...state,
        interviewPrepPacks: [
          pack,
          ...state.interviewPrepPacks.filter(
            (current) => current.applicationId !== pack.applicationId
          )
        ]
      },
      message
    )
    setAISettings(nextAISettings)
    saveAISettings(nextAISettings)
    setActiveTab("interview")
  }

  const generateInterviewPrep = (application: ApplicationRecord) => {
    const pack = createLocalInterviewPrepPack(
      application,
      state.profile,
      state.jobAnalysis
    )
    saveInterviewPrepPack(pack, "Interview prep pack generated")
  }

  const generateAIInterviewPrep = async (application: ApplicationRecord) => {
    const fallbackPack = createLocalInterviewPrepPack(
      application,
      state.profile,
      state.jobAnalysis
    )

    if (!canUseWebAI(aiSettings)) {
      saveInterviewPrepPack(
        fallbackPack,
        "AI interview prep skipped: add an API key or raise the local budget. Used local fallback."
      )
      return
    }

    try {
      const aiPrep = await generateAIInterviewPrepPack({
        settings: aiSettings,
        application,
        profile: state.profile,
        reusableAnswers: state.reusableAnswers,
        job: state.jobAnalysis,
        fallbackPack
      })
      const nextAISettings = {
        ...aiSettings,
        usedBudgetUsd: Number(
          (aiSettings.usedBudgetUsd + aiPrep.approximateCostUsd).toFixed(6)
        )
      }

      saveInterviewPrepPack(
        aiPrep.value,
        `AI interview prep pack generated. Estimated cost: $${aiPrep.approximateCostUsd.toFixed(
          6
        )}`,
        nextAISettings
      )
    } catch (error) {
      saveInterviewPrepPack(
        fallbackPack,
        `AI interview prep failed: ${getAIInterviewErrorMessage(
          error
        )} Used local fallback.`
      )
    }
  }

  const exportDashboard = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "autotime-v2-dashboard.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  const importDashboard = (value: string) => {
    if (!value.trim()) {
      setStatus("Paste exported V2 dashboard JSON before importing")
      return
    }

    try {
      const parsed = JSON.parse(value)
      const result = companionDashboardStateSchema.safeParse(parsed)

      if (!result.success) {
        setStatus("Import failed: dashboard JSON does not match V2 schema")
        return
      }

      persist(result.data, "Dashboard imported")
      setImportJson("")
    } catch {
      setStatus("Import failed: invalid JSON")
    }
  }

  return (
    <main className="dashboard-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">AutoTime EU Apply V2</p>
          <h1>Companion Dashboard</h1>
        </div>
        <div className="score-panel" aria-label="Current fit score">
          <span>{fitScore}%</span>
          <small>{state.jobAnalysis.recommendation || "fit score"}</small>
        </div>
      </header>

      <nav className="tab-bar" aria-label="Dashboard sections">
        {[
          ["profile", "Profile"],
          ["jobs", "Job Review"],
          ["applications", "Applications"],
          ["interview", "Interview Prep"]
        ].map(([id, label]) => (
          <button
            aria-pressed={activeTab === id}
            className={activeTab === id ? "tab-button active" : "tab-button"}
            key={id}
            type="button"
            onClick={() => setActiveTab(id as DashboardTab)}
          >
            {label}
          </button>
        ))}
      </nav>

      {status && <p className="status-banner">{status}</p>}

      <section className="metrics-strip" aria-label="V2 dashboard metrics">
        <div>
          <span>{state.applications.length}</span>
          <small>applications</small>
        </div>
        <div>
          <span>{interviewApplications.length}</span>
          <small>interviews</small>
        </div>
        <div>
          <span>{state.interviewPrepPacks.length}</span>
          <small>prep packs</small>
        </div>
        <div>
          <span>{state.jobAnalysis.skills?.length ?? 0}</span>
          <small>job skills</small>
        </div>
      </section>

      {activeTab === "profile" && (
        <section className="workspace-grid">
          <div className="input-column">
            <label>
              Full name
              <input
                value={state.profile.fullName}
                onChange={(event) =>
                  updateProfile("fullName", event.target.value)
                }
              />
            </label>
            <label>
              Target countries
              <input
                value={state.profile.targetCountries}
                onChange={(event) =>
                  updateProfile("targetCountries", event.target.value)
                }
              />
            </label>
            <label>
              Target roles
              <input
                value={state.profile.targetRoles}
                onChange={(event) =>
                  updateProfile("targetRoles", event.target.value)
                }
              />
            </label>
            <label>
              Work-right details
              <textarea
                value={state.profile.workRightDetails}
                onChange={(event) =>
                  updateProfile("workRightDetails", event.target.value)
                }
              />
            </label>
            <label>
              Base CV evidence
              <textarea
                value={state.profile.baseCvText}
                onChange={(event) =>
                  updateProfile("baseCvText", event.target.value)
                }
              />
            </label>
          </div>

          <div className="output-column">
            <section className="panel">
              <h2>Candidate Memory</h2>
              <dl className="summary-list">
                <div>
                  <dt>Current location</dt>
                  <dd>
                    {[state.profile.currentCity, state.profile.currentCountry]
                      .filter(Boolean)
                      .join(", ") || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt>Relocation</dt>
                  <dd>{state.profile.relocationWillingness}</dd>
                </div>
                <div>
                  <dt>Notice period</dt>
                  <dd>{state.profile.noticePeriod || "Not set"}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <h2>Reusable Answers</h2>
              <label>
                Motivation answer
                <textarea
                  value={state.reusableAnswers.motivationAnswer}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      reusableAnswers: {
                        ...current.reusableAnswers,
                        motivationAnswer: event.target.value
                      }
                    }))
                  }
                />
              </label>
              <label>
                Strengths answer
                <textarea
                  value={state.reusableAnswers.strengthsAnswer}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      reusableAnswers: {
                        ...current.reusableAnswers,
                        strengthsAnswer: event.target.value
                      }
                    }))
                  }
                />
              </label>
            </section>
          </div>
        </section>
      )}

      {activeTab === "jobs" && (
        <section className="workspace-grid">
          <div className="input-column">
            <label>
              Job title
              <input
                value={state.jobAnalysis.jobTitle}
                onChange={(event) => updateJob("jobTitle", event.target.value)}
              />
            </label>
            <label>
              Company
              <input
                value={state.jobAnalysis.company}
                onChange={(event) => updateJob("company", event.target.value)}
              />
            </label>
            <label>
              Job URL
              <input
                value={state.jobAnalysis.jobUrl}
                onChange={(event) => updateJob("jobUrl", event.target.value)}
              />
            </label>
            <label>
              Job description
              <textarea
                value={state.jobAnalysis.jobDescription}
                onChange={(event) =>
                  updateJob("jobDescription", event.target.value)
                }
              />
            </label>
            <button type="button" onClick={saveApplicationFromJob}>
              Save to Applications
            </button>
          </div>

          <div className="output-column">
            <section className="panel">
              <h2>Opportunity Intelligence</h2>
              <p className="large-copy">
                {state.jobAnalysis.positioningAngle ||
                  "Add job details to create a positioning angle."}
              </p>
              <ul className="bullets-list">
                {(state.jobAnalysis.scoreFactors?.length
                  ? state.jobAnalysis.scoreFactors
                  : ["No score factors saved yet."]
                ).map((factor) => (
                  <li key={factor}>{factor}</li>
                ))}
              </ul>
            </section>
            <section className="panel">
              <h2>Skills And Gaps</h2>
              <div className="tag-row">
                {(state.jobAnalysis.skills?.length
                  ? state.jobAnalysis.skills
                  : ["No skills detected yet"]
                ).map((skill) => (
                  <span className="tag" key={skill}>
                    {skill}
                  </span>
                ))}
              </div>
              <ul className="bullets-list">
                {(state.jobAnalysis.gaps?.length
                  ? state.jobAnalysis.gaps
                  : ["No gaps saved yet."]
                ).map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      )}

      {activeTab === "applications" && (
        <section className="applications-section full-width-section">
          <div>
            <h2>Application History</h2>
            <p>
              Review saved roles, update outcomes, and generate interview prep
              when a role reaches Interview.
            </p>
          </div>
          <div className="application-table">
            {state.applications.length ? (
              state.applications.map((application) => (
                <article className="application-row" key={application.id}>
                  <div>
                    <strong>{application.roleTitle || application.title}</strong>
                    <span>{application.company || "Unknown company"}</span>
                    <small>{application.url}</small>
                  </div>
                  <label>
                    Status
                    <select
                      value={application.status}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          status: event.target.value as ApplicationStatus
                        })
                      }
                    >
                      {applicationStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Next action
                    <input
                      value={application.nextAction ?? ""}
                      onChange={(event) =>
                        updateApplication(application.id, {
                          nextAction: event.target.value
                        })
                      }
                    />
                  </label>
                  <div className="application-actions">
                    <button
                      className="secondary-button"
                      disabled={application.status !== "Interview"}
                      type="button"
                      onClick={() => generateInterviewPrep(application)}
                    >
                      Generate Prep
                    </button>
                    {aiSettings.apiKey.trim() && (
                      <button
                        disabled={
                          application.status !== "Interview" ||
                          !canUseWebAI(aiSettings)
                        }
                        type="button"
                        onClick={() => void generateAIInterviewPrep(application)}
                      >
                        Generate AI Prep
                      </button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <p className="empty-state">No saved applications yet.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === "interview" && (
        <section className="prep-section full-width-section">
          <div>
            <h2>Interview Prep Packs</h2>
            <p>
              Prep packs use saved profile, job analysis and application state;
              they do not invent experience.
            </p>
          </div>
          <section className="ai-settings-panel" aria-label="AI interview settings">
            <div>
              <h3>AI Interview Settings</h3>
              <p>
                Optional browser-local OpenAI settings. Leave the key empty to
                use local prep only.
              </p>
            </div>
            <label>
              OpenAI API key
              <input
                type="password"
                value={aiSettings.apiKey}
                onChange={(event) =>
                  updateAISetting("apiKey", event.target.value)
                }
              />
            </label>
            <label>
              Model
              <select
                value={aiSettings.model}
                onChange={(event) =>
                  updateAISetting("model", event.target.value)
                }
              >
                <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                <option value="gpt-4.1-nano">gpt-4.1-nano</option>
                <option value="gpt-4o-mini">gpt-4o-mini</option>
              </select>
            </label>
            <label>
              Monthly budget USD
              <input
                min="0"
                step="0.01"
                type="number"
                value={aiSettings.monthlyBudgetUsd}
                onChange={(event) =>
                  updateAISetting(
                    "monthlyBudgetUsd",
                    Number(event.target.value)
                  )
                }
              />
            </label>
            <div className="ai-budget-summary">
              <span>${aiSettings.usedBudgetUsd.toFixed(6)}</span>
              <small>estimated used this browser</small>
            </div>
            <div className="application-actions">
              <button type="button" onClick={saveWebAISettings}>
                Save AI Settings
              </button>
              <button
                className="secondary-button"
                type="button"
                onClick={clearWebAISettings}
              >
                Clear AI Settings
              </button>
            </div>
          </section>
          <div className="prep-grid">
            {state.interviewPrepPacks.length ? (
              state.interviewPrepPacks.map((pack) => (
                <article className="prep-card" key={pack.id}>
                  <h3>{pack.roleSummary}</h3>
                  <p>{pack.positioningStatement}</p>
                  <h4>STAR Prompts</h4>
                  <ul className="bullets-list">
                    {pack.starAnswerPrompts.map((prompt) => (
                      <li key={prompt}>{prompt}</li>
                    ))}
                  </ul>
                  <h4>Likely Questions</h4>
                  <ul className="bullets-list">
                    {pack.likelyQuestions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                  <h4>Employer Questions</h4>
                  <ul className="bullets-list">
                    {pack.questionsToAskEmployer.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                  <h4>Final Checklist</h4>
                  <ul className="bullets-list">
                    {pack.finalPrepChecklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))
            ) : (
              <p className="empty-state">
                Move an application to Interview, then generate a prep pack.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="utility-bar">
        <button type="button" onClick={saveDashboard}>
          Save Dashboard
        </button>
        <button className="secondary-button" type="button" onClick={exportDashboard}>
          Export JSON
        </button>
        <label className="import-control">
          Import JSON
          <textarea
            placeholder="Paste exported V2 dashboard JSON"
            value={importJson}
            onChange={(event) => setImportJson(event.target.value)}
          />
        </label>
        <button
          className="secondary-button"
          type="button"
          onClick={() => importDashboard(importJson)}
        >
          Import Dashboard
        </button>
      </section>
    </main>
  )
}
