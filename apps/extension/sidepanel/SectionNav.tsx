// Navigation bar for the legacy multi-section side panel layout: primary
// tabs (job analysis, insights, account) plus a collapsible "Local tools"
// group for the rest, with a "!" badge on any section whose last save
// attempt failed validation. Currently unreached since `main.tsx` sets
// `renderLegacyTools = false`.
import { sections, type Section } from "./constants"
import { appUrl } from "../lib/openai"
import type { SaveAttempts } from "./types"

type SectionNavProps = {
  activeSection: Section
  applicationContentIssueCount: number
  jobAnalysisIssueCount: number
  onSectionChange: (section: Section) => void
  profileIssueCount: number
  reusableAnswerIssueCount: number
  saveAttempts: SaveAttempts
  trackerIssueCount: number
}

function NavAlert({ label }: { label: string }) {
  return (
    <span className="nav-alert" aria-label={label}>
      !
    </span>
  )
}

const primarySectionIds: Section[] = [
  "job-analysis",
  "job-analysis-view",
  "account"
]

function openDashboard() {
  chrome.tabs.create({ url: `${appUrl}/dashboard` })
}

/** Renders the primary/secondary section navigation, highlighting `activeSection` and showing validation-issue badges for sections where `saveAttempts[section]` is true and that section still has outstanding issues. */
export function SectionNav({
  activeSection,
  applicationContentIssueCount,
  jobAnalysisIssueCount,
  onSectionChange,
  profileIssueCount,
  reusableAnswerIssueCount,
  saveAttempts,
  trackerIssueCount
}: SectionNavProps) {
  const primarySections = sections.filter((section) =>
    primarySectionIds.includes(section.id)
  )
  const localSections = sections.filter(
    (section) => !primarySectionIds.includes(section.id)
  )

  return (
    <nav className="section-nav" aria-label="AutoTime sections">
      <div className="section-nav-primary">
        {primarySections.map((section) => (
          <button
            aria-current={activeSection === section.id ? "page" : undefined}
            className={activeSection === section.id ? "active" : ""}
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            type="button"
          >
            {section.label}
            {section.id === "job-analysis" &&
              saveAttempts["job-analysis"] &&
              jobAnalysisIssueCount > 0 && (
                <NavAlert label="Job details need attention" />
              )}
          </button>
        ))}
      </div>

      <button
        className="dashboard-link-button"
        type="button"
        onClick={openDashboard}
      >
        Open Dashboard
      </button>

      <details className="section-nav-more">
        <summary>Local tools</summary>
        <div className="section-nav-group">
          {localSections.map((section) => (
            <button
              aria-current={activeSection === section.id ? "page" : undefined}
              className={activeSection === section.id ? "active" : ""}
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              type="button"
            >
              {section.label}
              {section.id === "profile" &&
                saveAttempts.profile &&
                profileIssueCount > 0 && (
                  <NavAlert label="Profile needs attention" />
                )}
              {section.id === "application-content" &&
                saveAttempts["application-content"] &&
                applicationContentIssueCount > 0 && (
                  <NavAlert label="Application Content needs attention" />
                )}
              {section.id === "reusable-answers" &&
                saveAttempts["reusable-answers"] &&
                reusableAnswerIssueCount > 0 && (
                  <NavAlert label="Reusable Answers need attention" />
                )}
              {section.id === "tracker" &&
                saveAttempts.tracker &&
                trackerIssueCount > 0 && (
                  <NavAlert label="Tracker needs attention" />
                )}
            </button>
          ))}
        </div>
      </details>
    </nav>
  )
}
