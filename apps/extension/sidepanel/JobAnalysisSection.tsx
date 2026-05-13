import type { Ref } from "react"
import type { JobAnalysisDraft } from "../lib/storage"
import type { JobAnalysisIssue } from "../lib/validation"
import { getJobIssueForField } from "../lib/validation"
import { MetricReveal } from "./MetricReveal"
import { getStatusClassName } from "./utils"

type JobAnalysisSectionProps = {
  draft: JobAnalysisDraft
  issues: JobAnalysisIssue[]
  onFieldChange: <K extends keyof JobAnalysisDraft>(
    key: K,
    value: JobAnalysisDraft[K]
  ) => void
  onImportCurrentJobPage: () => void
  onSave: () => void
  saveAttempted: boolean
  savedDraft: JobAnalysisDraft | null
  status: string
  statusRef: Ref<HTMLParagraphElement>
}

const keywordFallbacks = [
  "python",
  "openai",
  "anthropic",
  "llm",
  "rag",
  "nlp",
  "api",
  "document",
  "financial",
  "dashboard",
  "data",
  "analysis",
  "modelling",
  "legal",
  "risk"
]

function getWorkModeLabel(workMode: JobAnalysisDraft["workMode"]) {
  if (workMode === "onsite") {
    return "On-site"
  }

  if (workMode === "hybrid") {
    return "Hybrid"
  }

  if (workMode === "remote") {
    return "Remote"
  }

  return "Work mode unknown"
}

function getKeywords(draft: JobAnalysisDraft) {
  if (draft.skills?.length) {
    return draft.skills.slice(0, 8)
  }

  const description = draft.jobDescription.toLowerCase()

  return keywordFallbacks
    .filter((keyword) => description.includes(keyword))
    .slice(0, 8)
}

function getDescriptionStats(description: string) {
  const text = description.trim()

  if (!text) {
    return { label: "No description", value: "No words" }
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length

  return {
    label: wordCount > 350 ? "Detailed post" : "Short post",
    value: `${wordCount} words`
  }
}

export function JobAnalysisSection({
  draft,
  issues,
  onFieldChange,
  onImportCurrentJobPage,
  onSave,
  saveAttempted,
  savedDraft,
  status,
  statusRef
}: JobAnalysisSectionProps) {
  const displayDraft =
    draft.jobTitle.trim() ||
    draft.company.trim() ||
    draft.jobDescription.trim() ||
    draft.jobUrl.trim()
      ? draft
      : (savedDraft ?? draft)
  const keywords = getKeywords(displayDraft)
  const descriptionStats = getDescriptionStats(displayDraft.jobDescription)
  const hasSavedInsights = Boolean(savedDraft?.summary || savedDraft?.fitScore)

  return (
    <section className="panel-section job-workspace">
      <div className="job-hero">
        <div>
          <p className="panel-eyebrow">Job details</p>
          <h2>{displayDraft.jobTitle || "Current job"}</h2>
          <p className="job-meta">
            {[
              displayDraft.company,
              displayDraft.location,
              getWorkModeLabel(displayDraft.workMode)
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="job-hero-actions">
          <button type="button" onClick={onImportCurrentJobPage}>
            Track Job
          </button>
          <button type="button" onClick={onSave}>
            Analyse Fit
          </button>
        </div>
      </div>

      <div className="form-grid">
        {saveAttempted && issues.length > 0 && (
          <div className="alert-panel" role="alert">
            <strong>Job Analysis needs attention</strong>
            <ul>
              {issues.map((issue) => (
                <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="insight-grid" aria-label="Job snapshot">
          <div className="insight-card">
            <span>Fit score</span>
            <strong>
              {typeof savedDraft?.fitScore === "number" ? (
                <MetricReveal label="Show fit score">
                  {savedDraft.fitScore}/100
                </MetricReveal>
              ) : (
                "Pending"
              )}
            </strong>
          </div>
          <div className="insight-card">
            <span>Recommendation</span>
            <strong>{savedDraft?.recommendation || "Not scored"}</strong>
          </div>
          <div className="insight-card">
            <span>Description</span>
            <strong>
              {descriptionStats.value === "No words" ? (
                descriptionStats.value
              ) : (
                <MetricReveal label="Show description word count">
                  {descriptionStats.value}
                </MetricReveal>
              )}
            </strong>
            <small>{descriptionStats.label}</small>
          </div>
        </div>

        {keywords.length > 0 ? (
          <div className="keyword-panel" aria-label="Detected keywords">
            {keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        ) : null}

        {hasSavedInsights && savedDraft?.summary ? (
          <div className="summary-card">
            <h3>Latest insight</h3>
            <p>{savedDraft.summary}</p>
          </div>
        ) : null}

        <label>
          Job title
          {saveAttempted && getJobIssueForField(issues, "jobTitle") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "jobTitle")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "jobTitle")
            )}
            value={draft.jobTitle}
            onChange={(event) => onFieldChange("jobTitle", event.target.value)}
          />
        </label>

        <label>
          Company
          {saveAttempted && getJobIssueForField(issues, "company") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "company")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "company")
            )}
            value={draft.company}
            onChange={(event) => onFieldChange("company", event.target.value)}
          />
        </label>

        <label>
          Job URL
          {saveAttempted && getJobIssueForField(issues, "jobUrl") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "jobUrl")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "jobUrl")
            )}
            type="url"
            value={draft.jobUrl}
            onChange={(event) => onFieldChange("jobUrl", event.target.value)}
          />
        </label>

        <label>
          Location/country
          {saveAttempted && getJobIssueForField(issues, "location") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "location")}
            </span>
          )}
          <input
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "location")
            )}
            value={draft.location}
            onChange={(event) => onFieldChange("location", event.target.value)}
          />
        </label>

        <label>
          Work mode
          {saveAttempted && getJobIssueForField(issues, "workMode") && (
            <span className="field-alert">
              {getJobIssueForField(issues, "workMode")}
            </span>
          )}
          <select
            aria-invalid={Boolean(
              saveAttempted && getJobIssueForField(issues, "workMode")
            )}
            value={draft.workMode}
            onChange={(event) =>
              onFieldChange(
                "workMode",
                event.target.value as JobAnalysisDraft["workMode"]
              )
            }
          >
            <option value="unknown">Select work mode</option>
            <option value="onsite">On-site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </label>

        <label>
          Pasted job description
          <textarea
            value={draft.jobDescription}
            onChange={(event) =>
              onFieldChange("jobDescription", event.target.value)
            }
          />
        </label>

        <label>
          Notes
          <textarea
            value={draft.notes}
            onChange={(event) => onFieldChange("notes", event.target.value)}
          />
        </label>

        {status && (
          <p
            className={getStatusClassName(status)}
            ref={statusRef}
            role="status"
            tabIndex={-1}
          >
            {status}
          </p>
        )}
      </div>
    </section>
  )
}
